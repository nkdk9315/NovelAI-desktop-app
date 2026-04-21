use crate::models::dto::GenerateImageRequest;

pub struct PromptSnapshotInput {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub width: u32,
    pub height: u32,
    pub steps: u32,
    pub scale: f64,
    pub cfg_rescale: f64,
    pub sampler: String,
    pub noise_schedule: String,
    pub model: String,
    pub characters: Option<serde_json::Value>,
    pub vibes: Option<serde_json::Value>,
    pub ui_snapshot: Option<serde_json::Value>,
}

impl PromptSnapshotInput {
    pub fn from_request(req: &GenerateImageRequest) -> Self {
        let characters = req
            .characters
            .as_ref()
            .map(|chars| serde_json::to_value(chars).unwrap_or(serde_json::Value::Null));
        let vibes = req
            .vibes
            .as_ref()
            .map(|vibes| serde_json::to_value(vibes).unwrap_or(serde_json::Value::Null));
        Self {
            prompt: req.prompt.clone(),
            negative_prompt: req.negative_prompt.clone(),
            width: req.width,
            height: req.height,
            steps: req.steps,
            scale: req.scale,
            cfg_rescale: req.cfg_rescale,
            sampler: req.sampler.clone(),
            noise_schedule: req.noise_schedule.clone(),
            model: req.model.clone(),
            characters,
            vibes,
            ui_snapshot: req.ui_snapshot.clone(),
        }
    }

    pub fn build(self, seed: u64) -> serde_json::Value {
        serde_json::json!({
            "prompt": self.prompt,
            "negative_prompt": self.negative_prompt,
            "width": self.width,
            "height": self.height,
            "steps": self.steps,
            "scale": self.scale,
            "cfg_rescale": self.cfg_rescale,
            "sampler": self.sampler,
            "noise_schedule": self.noise_schedule,
            "model": self.model,
            "seed": seed,
            "characters": self.characters,
            "vibes": self.vibes,
            "ui_snapshot": self.ui_snapshot,
        })
    }
}
