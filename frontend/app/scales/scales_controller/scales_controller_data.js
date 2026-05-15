import { useEffect } from "https://esm.sh/react@18";
import { DEFAULT_TUNING_NAME } from "defaults";
import { fetchJSON } from "../../shared/api/client.js";
import {
  findScaleByRouteValue,
  findTuningByRouteValue,
} from "./scales_controller_helpers.js";

function useLoadScaleCatalog({
  routeState,
  setScales,
  setSelectedScaleId,
  setError,
}) {
  useEffect(() => {
    fetchJSON("/api/v1/scales", "scales")
      .then((data) => {
        const list = data.scales || [];
        setScales(list);
        setSelectedScaleId((current) => {
          const routeScale = findScaleByRouteValue(list, routeState?.scale);
          if (routeScale) {
            return routeScale.id;
          }
          if (list.some((scale) => scale.id === Number(current))) {
            return current;
          }
          return list[0]?.id ?? current;
        });
      })
      .catch((err) => setError(err.message));
  }, []);
}

function useLoadTunings({
  routeState,
  setTunings,
  setSelectedTuningId,
  setError,
}) {
  useEffect(() => {
    fetchJSON("/api/v1/tunings", "tunings")
      .then((data) => {
        const list = data.tunings || [];
        setTunings(list);
        setSelectedTuningId((current) => {
          const routeTuning = findTuningByRouteValue(list, routeState?.tuning);
          if (routeTuning) {
            return routeTuning.id;
          }
          if (list.some((tuning) => tuning.id === Number(current))) {
            return current;
          }
          const standard = list.find((tuning) => tuning.name === DEFAULT_TUNING_NAME);
          return (standard ?? list[0])?.id ?? current;
        });
      })
      .catch((err) => setError(err.message));
  }, []);
}

function useLoadScaleLayouts({
  setLayoutInstances,
  setError,
}) {
  useEffect(() => {
    fetchJSON("/api/v1/scales/scale_layouts", "scale layouts")
      .then((data) => setLayoutInstances(data.tunings || []))
      .catch((err) => setError(err.message));
  }, []);
}

export {
  useLoadScaleCatalog,
  useLoadTunings,
  useLoadScaleLayouts,
};
