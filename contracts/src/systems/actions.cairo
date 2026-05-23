#[starknet::interface]
pub trait IActions<T> {
    fn start_run(ref self: T, seed: felt252) -> felt252;
    fn choose_option(ref self: T, run_id: felt252, stat: u8);
    fn assign_stat_point(ref self: T, run_id: felt252, stat: u8);
    fn choose_reward(ref self: T, run_id: felt252, reward_index: u8, equip_now: bool);
    fn equip_item(ref self: T, run_id: felt252, item_id: u16);
}

#[starknet::interface]
pub trait IActionsView<T> {
    fn active_run_id(self: @T, player: starknet::ContractAddress) -> felt252;
    fn get_run(self: @T, run_id: felt252) -> gravenhold::models::index::Run;
    fn get_character(self: @T, run_id: felt252) -> gravenhold::models::index::Character;
    fn get_current_encounter(
        self: @T, run_id: felt252,
    ) -> gravenhold::models::index::CurrentEncounter;
    fn get_choice_forecast(
        self: @T, run_id: felt252, stat: u8,
    ) -> gravenhold::models::index::ChoiceForecast;
    fn get_choice_log(
        self: @T, run_id: felt252, index: u16,
    ) -> gravenhold::models::index::ChoiceLog;
    fn get_reward_offer(
        self: @T, run_id: felt252, index: u8,
    ) -> gravenhold::models::index::RewardOffer;
    fn get_reward_log(
        self: @T, run_id: felt252, index: u16,
    ) -> gravenhold::models::index::RewardLog;
    fn get_item(self: @T, item_id: u16) -> gravenhold::models::index::ItemView;
}

#[dojo::contract]
pub mod actions {
    use core::poseidon::poseidon_hash_span;
    use dojo::world::WorldStorage;
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use gravenhold::constants::{
        BOSS_VICTORY_HEAL, DEFAULT_NS, MAX_LEVEL, PHASE_COMPLETE, PHASE_ENCOUNTER, PHASE_REWARD,
        PHASE_STAT_ALLOCATE, REWARD_CHOICES_PER_LEVEL, REWARD_REASON_MIXED, REWARD_REASON_RANDOM,
        REWARD_REASON_STRONGEST_STAT, SIGN_NEGATIVE, SIGN_POSITIVE, SIGN_ZERO, STATUS_LOST,
        STATUS_PLAYING, STATUS_REWARD, STATUS_WON,
    };
    use gravenhold::content::data::{
        STAT_AGILITY, STAT_INTELLECT, STAT_SPIRIT, STAT_STRENGTH, item_bonus, item_slot, item_tier,
    };
    use gravenhold::helpers::encounters::{
        apply_choice_strain, current_encounter, forecast_choice, is_final_encounter, is_valid_stat,
    };
    use gravenhold::helpers::items::{
        add_inventory, equip_owned_item, inventory_has, item_exists, pick_reward_item, reward_tier,
        strongest_stat,
    };
    use gravenhold::helpers::progression::{apply_xp, xp_for_encounter};
    use gravenhold::models::index::{
        ActiveRun, Character, ChoiceForecast, ChoiceLog, CurrentEncounter, ItemView,
        PlayerRunCounter, RewardLog, RewardOffer, Run,
    };
    use gravenhold::models::run::{CharacterTrait, RunTrait};
    use gravenhold::store::{Store, StoreTrait};

    #[storage]
    struct Storage {}

    pub mod Errors {
        pub const INVALID_STAT: felt252 = 'Choice: invalid stat';
        pub const NOT_PLAYING: felt252 = 'Run: not playing';
        pub const NOT_ENCOUNTER: felt252 = 'Run: not encounter';
        pub const NOT_REWARD: felt252 = 'Run: not reward';
        pub const BAD_REWARD: felt252 = 'Reward: invalid';
        pub const BAD_ITEM: felt252 = 'Item: invalid';
        pub const ITEM_NOT_OWNED: felt252 = 'Item: not owned';
        pub const RUN_LOST: felt252 = 'Run: lost';
        pub const NO_STAT_POINTS: felt252 = 'Stats: no points';
        pub const NOT_STAT_ALLOCATE: felt252 = 'Run: not stat alloc';
    }

    fn apply_stat_point(mut character: Character, stat: u8) -> Character {
        if stat == STAT_STRENGTH {
            character.strength += 1;
        } else if stat == STAT_INTELLECT {
            character.intellect += 1;
        } else if stat == STAT_AGILITY {
            character.agility += 1;
        } else if stat == STAT_SPIRIT {
            character.spirit += 1;
        }

        character
    }

    fn status_for_phase(phase: u8) -> u8 {
        if phase == PHASE_REWARD {
            STATUS_REWARD
        } else {
            STATUS_PLAYING
        }
    }

    fn health_delta_sign_and_amount(before: u16, after: u16) -> (u8, u16) {
        if after > before {
            (SIGN_POSITIVE, after - before)
        } else if before > after {
            (SIGN_NEGATIVE, before - after)
        } else {
            (SIGN_ZERO, 0)
        }
    }

    fn heal_to_max(value: u16, amount: u16, max: u16) -> u16 {
        let healed = value + amount;
        if healed > max {
            max
        } else {
            healed
        }
    }

    fn write_reward_offers(mut store: Store, run: @Run, character: @Character) {
        let build_stat = strongest_stat(character);
        let tier = reward_tier(*run.level);
        let first_item = pick_reward_item(
            *run.seed, *run.level, REWARD_REASON_STRONGEST_STAT, build_stat, character, 0, 0,
        );
        let second_item = pick_reward_item(
            *run.seed, *run.level, REWARD_REASON_RANDOM, build_stat, character, first_item, 0,
        );
        let third_item = pick_reward_item(
            *run.seed,
            *run.level,
            REWARD_REASON_MIXED,
            build_stat,
            character,
            first_item,
            second_item,
        );

        store
            .set_reward_offer(
                @RewardOffer {
                    run_id: *run.id,
                    index: 0,
                    level: *run.level,
                    item_id: first_item,
                    reason: REWARD_REASON_STRONGEST_STAT,
                    tier,
                    active: true,
                },
            );
        store
            .set_reward_offer(
                @RewardOffer {
                    run_id: *run.id,
                    index: 1,
                    level: *run.level,
                    item_id: second_item,
                    reason: REWARD_REASON_RANDOM,
                    tier,
                    active: true,
                },
            );
        store
            .set_reward_offer(
                @RewardOffer {
                    run_id: *run.id,
                    index: 2,
                    level: *run.level,
                    item_id: third_item,
                    reason: REWARD_REASON_MIXED,
                    tier,
                    active: true,
                },
            );
    }

    fn clear_reward_offers(mut store: Store, run_id: felt252) {
        let mut index: u8 = 0;
        while index < REWARD_CHOICES_PER_LEVEL {
            let mut offer = store.reward_offer(run_id, index);
            offer.active = false;
            store.set_reward_offer(@offer);
            index += 1;
        }
    }

    #[abi(embed_v0)]
    impl ActionsImpl of super::IActions<ContractState> {
        fn start_run(ref self: ContractState, seed: felt252) -> felt252 {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let mut store = StoreTrait::new(world);
            let player = get_caller_address();

            let mut counter: PlayerRunCounter = store.run_counter(player);
            let nonce = counter.next_nonce;
            let run_id = poseidon_hash_span([player.into(), nonce.into()].span());
            counter.next_nonce = nonce + 1;

            let run: Run = RunTrait::new(run_id, player, seed, nonce);
            let character: Character = CharacterTrait::new(run_id);

            store.set_run(@run);
            store.set_character(@character);
            store.set_active_run(@ActiveRun { player, run_id });
            store.set_run_counter(@counter);

            run_id
        }

        fn choose_option(ref self: ContractState, run_id: felt252, stat: u8) {
            assert(is_valid_stat(stat), Errors::INVALID_STAT);

            let world: WorldStorage = self.world(@DEFAULT_NS());
            let mut store = StoreTrait::new(world);
            let mut run: Run = store.run(run_id);
            run.assert_exists();
            run.assert_owner(get_caller_address());
            assert(run.status == STATUS_PLAYING, Errors::NOT_PLAYING);
            assert(run.phase == PHASE_ENCOUNTER, Errors::NOT_ENCOUNTER);

            let mut character: Character = store.character(run_id);
            let forecast: ChoiceForecast = forecast_choice(@run, @character, stat);
            let encounter = current_encounter(run.seed, run.level, run.encounter_index);
            let old_health = character.health;
            let old_xp_level = character.xp_level;
            let xp_gain = xp_for_encounter(run.level, forecast.boss_encounter);

            if forecast.success {
                if forecast.boss_encounter {
                    character.health = heal_to_max(
                        character.health, BOSS_VICTORY_HEAL, character.max_health,
                    );
                }
            } else if character.health <= forecast.health_loss_on_failure {
                character.health = 0;
            } else {
                character.health -= forecast.health_loss_on_failure;
            }
            character = apply_choice_strain(character, stat, forecast.success, forecast.approach);
            character = apply_xp(character, xp_gain);
            let leveled_up = character.xp_level > old_xp_level;

            let (health_delta_sign, health_delta_amount) = health_delta_sign_and_amount(
                old_health, character.health,
            );
            let defeated_by_failure = !forecast.success && character.health == 0;
            let should_retry_boss = forecast.boss_encounter && !forecast.success
                && !defeated_by_failure;
            let completed_level = if forecast.success || !forecast.boss_encounter {
                is_final_encounter(run.encounter_index)
            } else {
                false
            };
            let boss_defeated = forecast.boss_encounter && forecast.success;

            let choice_index = run.choice_count;
            run.choice_count = choice_index + 1;
            let mut should_write_reward = false;

            if defeated_by_failure {
                run.status = STATUS_LOST;
                run.phase = PHASE_COMPLETE;
                run.pending_phase = PHASE_COMPLETE;
                run.ended_at = get_block_timestamp();
            } else if !should_retry_boss {
                if completed_level {
                    if run.level >= MAX_LEVEL {
                        run.status = STATUS_WON;
                        run.phase = PHASE_COMPLETE;
                        run.pending_phase = PHASE_COMPLETE;
                        run.ended_at = get_block_timestamp();
                    } else {
                        run.status = STATUS_REWARD;
                        run.phase = PHASE_REWARD;
                        run.pending_phase = PHASE_REWARD;
                        should_write_reward = true;
                    }
                } else {
                    run.encounter_index += 1;
                    run.status = STATUS_PLAYING;
                    run.phase = PHASE_ENCOUNTER;
                    run.pending_phase = PHASE_ENCOUNTER;
                }
            }

            if run.phase != PHASE_COMPLETE && character.unspent_stat_points > 0 {
                should_write_reward = false;
                run.pending_phase = run.phase;
                run.status = STATUS_PLAYING;
                run.phase = PHASE_STAT_ALLOCATE;
            }

            if should_write_reward {
                write_reward_offers(store, @run, @character);
            }

            store
                .set_choice_log(
                    @ChoiceLog {
                        run_id,
                        index: choice_index,
                        level: encounter.level,
                        encounter_index: encounter.encounter_index,
                        encounter_id: encounter.encounter_id,
                        stat,
                        success: forecast.success,
                        effective_stat: forecast.effective_stat,
                        base_difficulty: forecast.base_difficulty,
                        difficulty: forecast.difficulty,
                        difficulty_modifier_sign: forecast.difficulty_modifier_sign,
                        difficulty_modifier_amount: forecast.difficulty_modifier_amount,
                        health_delta_sign,
                        health_delta_amount,
                        xp_gain,
                        xp_level_after: character.xp_level,
                        leveled_up,
                        boss_encounter: forecast.boss_encounter,
                        boss_defeated,
                        completed_level,
                        game_ended: run.phase == PHASE_COMPLETE,
                    },
                );
            store.set_character(@character);
            store.set_run(@run);
        }

        fn assign_stat_point(ref self: ContractState, run_id: felt252, stat: u8) {
            assert(is_valid_stat(stat), Errors::INVALID_STAT);

            let world: WorldStorage = self.world(@DEFAULT_NS());
            let mut store = StoreTrait::new(world);
            let mut run: Run = store.run(run_id);
            run.assert_exists();
            run.assert_owner(get_caller_address());
            assert(run.status == STATUS_PLAYING, Errors::NOT_PLAYING);
            assert(run.phase == PHASE_STAT_ALLOCATE, Errors::NOT_STAT_ALLOCATE);

            let mut character: Character = store.character(run_id);
            assert(character.unspent_stat_points > 0, Errors::NO_STAT_POINTS);

            character = apply_stat_point(character, stat);
            character.unspent_stat_points -= 1;

            if character.unspent_stat_points == 0 {
                let next_phase = run.pending_phase;
                run.phase = next_phase;
                run.status = status_for_phase(next_phase);
                run.pending_phase = PHASE_ENCOUNTER;

                if next_phase == PHASE_REWARD {
                    write_reward_offers(store, @run, @character);
                }
            }

            store.set_character(@character);
            store.set_run(@run);
        }

        fn choose_reward(ref self: ContractState, run_id: felt252, reward_index: u8, equip_now: bool) {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let mut store = StoreTrait::new(world);
            let mut run: Run = store.run(run_id);
            run.assert_exists();
            run.assert_owner(get_caller_address());
            assert(run.status == STATUS_REWARD && run.phase == PHASE_REWARD, Errors::NOT_REWARD);
            assert(reward_index < REWARD_CHOICES_PER_LEVEL, Errors::BAD_REWARD);

            let offer = store.reward_offer(run_id, reward_index);
            assert(offer.active, Errors::BAD_REWARD);
            assert(item_exists(offer.item_id), Errors::BAD_ITEM);

            let mut character = store.character(run_id);
            character = add_inventory(character, offer.item_id);
            if equip_now {
                character = equip_owned_item(character, offer.item_id);
            }

            let log_index = run.reward_count;
            run.reward_count = log_index + 1;
            store
                .set_reward_log(
                    @RewardLog {
                        run_id,
                        index: log_index,
                        level: offer.level,
                        item_id: offer.item_id,
                        equipped: equip_now,
                    },
                );

            clear_reward_offers(store, run_id);

            run.level += 1;
            run.encounter_index = 0;
            run.status = STATUS_PLAYING;
            run.phase = PHASE_ENCOUNTER;
            run.pending_phase = PHASE_ENCOUNTER;

            store.set_character(@character);
            store.set_run(@run);
        }

        fn equip_item(ref self: ContractState, run_id: felt252, item_id: u16) {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let mut store = StoreTrait::new(world);
            let run: Run = store.run(run_id);
            run.assert_exists();
            run.assert_owner(get_caller_address());
            assert(run.status != STATUS_LOST, Errors::RUN_LOST);
            assert(item_exists(item_id), Errors::BAD_ITEM);

            let mut character = store.character(run_id);
            assert(inventory_has(@character, item_id), Errors::ITEM_NOT_OWNED);
            character = equip_owned_item(character, item_id);
            store.set_character(@character);
        }
    }

    #[abi(embed_v0)]
    impl ActionsViewImpl of super::IActionsView<ContractState> {
        fn active_run_id(self: @ContractState, player: ContractAddress) -> felt252 {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).active_run(player).run_id
        }

        fn get_run(self: @ContractState, run_id: felt252) -> Run {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).run(run_id)
        }

        fn get_character(self: @ContractState, run_id: felt252) -> Character {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).character(run_id)
        }

        fn get_current_encounter(self: @ContractState, run_id: felt252) -> CurrentEncounter {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let store = StoreTrait::new(world);
            let run = store.run(run_id);
            current_encounter(run.seed, run.level, run.encounter_index)
        }

        fn get_choice_forecast(
            self: @ContractState, run_id: felt252, stat: u8,
        ) -> ChoiceForecast {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            let store = StoreTrait::new(world);
            let run = store.run(run_id);
            let character = store.character(run_id);
            forecast_choice(@run, @character, stat)
        }

        fn get_choice_log(self: @ContractState, run_id: felt252, index: u16) -> ChoiceLog {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).choice_log(run_id, index)
        }

        fn get_reward_offer(self: @ContractState, run_id: felt252, index: u8) -> RewardOffer {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).reward_offer(run_id, index)
        }

        fn get_reward_log(self: @ContractState, run_id: felt252, index: u16) -> RewardLog {
            let world: WorldStorage = self.world(@DEFAULT_NS());
            StoreTrait::new(world).reward_log(run_id, index)
        }

        fn get_item(self: @ContractState, item_id: u16) -> ItemView {
            let exists = item_exists(item_id);
            ItemView {
                item_id,
                exists,
                slot: item_slot(item_id),
                tier: item_tier(item_id),
                strength_bonus: item_bonus(item_id, STAT_STRENGTH),
                intellect_bonus: item_bonus(item_id, STAT_INTELLECT),
                agility_bonus: item_bonus(item_id, STAT_AGILITY),
                spirit_bonus: item_bonus(item_id, STAT_SPIRIT),
            }
        }
    }
}
