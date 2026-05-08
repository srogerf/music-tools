package scales

type CatalogGroup struct {
	Code  string `json:"code"`
	Label string `json:"label"`
	Order int    `json:"order"`
}

func EnrichDefinitions(set *DefinitionSet) {
	if set == nil {
		return
	}
	for index := range set.Scales {
		EnrichDefinition(&set.Scales[index])
	}
}

func EnrichDefinition(scale *Definition) {
	if scale == nil {
		return
	}
	if scale.ParentModeLabel == "" {
		scale.ParentModeLabel = parentModeLabel(scale.ParentFamily, scale.ParentModeNumber)
	}
}
