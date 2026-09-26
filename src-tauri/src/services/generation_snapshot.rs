use crate::models::dto::{GenerateActionRequest, GenerateImageRequest};

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
    /// Action parameters without the image data (e.g. `{"type":"img2img","strength":0.7}`)
    pub action: serde_json::Value,
    /// Character reference settings without the image data
    pub character_reference: Option<serde_json::Value>,
}

/// Summarise the action for the history (source image / mask bytes are not stored).
pub fn action_summary(action: &GenerateActionRequest) -> serde_json::Value {
    match action {
        GenerateActionRequest::Generate => serde_json::json!({ "type": "generate" }),
        GenerateActionRequest::Img2Img { strength, noise, .. } => {
            serde_json::json!({ "type": "img2img", "strength": strength, "noise": noise })
        }
        GenerateActionRequest::Infill { mask_strength, color_correct, .. } => serde_json::json!({
            "type": "infill",
            "strength": mask_strength,
            "colorCorrect": color_correct,
        }),
    }
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
            action: action_summary(&req.action),
            character_reference: req.character_reference.as_ref().map(|c| {
                serde_json::json!({ "mode": c.mode, "strength": c.strength, "fidelity": c.fidelity })
            }),
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
            "action": self.action,
            "character_reference": self.character_reference,
        })
    }
}
