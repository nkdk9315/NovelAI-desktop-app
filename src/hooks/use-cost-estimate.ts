import { useMemo } from "react";
import type { CostEstimateRequest } from "@/types";
import { calculateCost } from "@/lib/cost";

export function useCostEstimate(params: CostEstimateRequest) {
  return useMemo(() => calculateCost(params), [params]);
}
