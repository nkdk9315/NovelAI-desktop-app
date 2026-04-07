import type { CostEstimateRequest, CostResultDto } from "@/types";

export function calculateCost(_params: CostEstimateRequest): CostResultDto {
  // TODO: Port cost calculation from novelai_api_client/rust-api/src/anlas.rs
  void _params;
  return { totalCost: 0, isOpusFree: false };
}
