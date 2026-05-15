import { useEffect } from "https://esm.sh/react@18";
import { DEFAULT_KEYS } from "defaults";
import {
  CAGED_SHAPES,
  THREE_NPS_SHAPES,
} from "scales-layout";
import {
  findScaleByRouteValue,
  findTuningByRouteValue,
} from "./scales_controller_helpers.js";

function useSyncRouteScale({
  routeState,
  scales,
  setSelectedScaleId,
}) {
  useEffect(() => {
    if (scales.length === 0) return;
    const routeScale = findScaleByRouteValue(scales, routeState?.scale);
    if (routeScale) {
      setSelectedScaleId((current) => (routeScale.id === Number(current) ? current : routeScale.id));
    }
  }, [routeState?.scale, scales]);
}

function useSyncRouteTuning({
  routeState,
  tunings,
  setSelectedTuningId,
}) {
  useEffect(() => {
    if (tunings.length === 0) return;
    const routeTuning = findTuningByRouteValue(tunings, routeState?.tuning);
    if (routeTuning) {
      setSelectedTuningId((current) => (routeTuning.id === Number(current) ? current : routeTuning.id));
    }
  }, [routeState?.tuning, tunings]);
}

function useSyncRouteKey({
  routeState,
  setSelectedKey,
}) {
  useEffect(() => {
    if (routeState?.key && DEFAULT_KEYS.includes(routeState.key)) {
      setSelectedKey((current) => (current === routeState.key ? current : routeState.key));
    }
  }, [routeState?.key]);
}

function useSyncRoutePosition({
  routeState,
  setSelectedPosition,
}) {
  useEffect(() => {
    if (routeState?.position && [...CAGED_SHAPES, ...THREE_NPS_SHAPES].includes(routeState.position)) {
      setSelectedPosition((current) => (current === routeState.position ? current : routeState.position));
    }
  }, [routeState?.position]);
}

function useSyncRouteThreeNps({
  routeState,
  setUseThreeNps,
}) {
  useEffect(() => {
    const nextThreeNps = Boolean(routeState?.threeNps);
    setUseThreeNps((current) => (current === nextThreeNps ? current : nextThreeNps));
  }, [routeState?.threeNps]);
}

export {
  useSyncRouteKey,
  useSyncRoutePosition,
  useSyncRouteScale,
  useSyncRouteThreeNps,
  useSyncRouteTuning,
};
