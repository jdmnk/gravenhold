use dojo::model::ModelStorage;
use dojo::world::WorldStorage;
use starknet::ContractAddress;
use crate::models::index::{
    ActiveRun, Character, ChoiceLog, PlayerRunCounter, RewardLog, RewardOffer, Run,
};

#[derive(Copy, Drop)]
pub struct Store {
    pub world: WorldStorage,
}

#[generate_trait]
pub impl StoreImpl of StoreTrait {
    #[inline]
    fn new(world: WorldStorage) -> Store {
        Store { world }
    }

    fn run(self: @Store, id: felt252) -> Run {
        self.world.read_model(id)
    }

    fn set_run(mut self: Store, model: @Run) {
        self.world.write_model(model);
    }

    fn character(self: @Store, run_id: felt252) -> Character {
        self.world.read_model(run_id)
    }

    fn set_character(mut self: Store, model: @Character) {
        self.world.write_model(model);
    }

    fn active_run(self: @Store, player: ContractAddress) -> ActiveRun {
        self.world.read_model(player)
    }

    fn set_active_run(mut self: Store, model: @ActiveRun) {
        self.world.write_model(model);
    }

    fn run_counter(self: @Store, player: ContractAddress) -> PlayerRunCounter {
        self.world.read_model(player)
    }

    fn set_run_counter(mut self: Store, model: @PlayerRunCounter) {
        self.world.write_model(model);
    }

    fn choice_log(self: @Store, run_id: felt252, index: u16) -> ChoiceLog {
        self.world.read_model((run_id, index))
    }

    fn set_choice_log(mut self: Store, model: @ChoiceLog) {
        self.world.write_model(model);
    }

    fn reward_offer(self: @Store, run_id: felt252, index: u8) -> RewardOffer {
        self.world.read_model((run_id, index))
    }

    fn set_reward_offer(mut self: Store, model: @RewardOffer) {
        self.world.write_model(model);
    }

    fn reward_log(self: @Store, run_id: felt252, index: u16) -> RewardLog {
        self.world.read_model((run_id, index))
    }

    fn set_reward_log(mut self: Store, model: @RewardLog) {
        self.world.write_model(model);
    }
}
