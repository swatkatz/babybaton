package graph

import (
	"time"

	"github.com/swatkatz/babybaton/backend/graph/model"
)

func stringPtr(s string) *string {
	return &s
}

// GetMockPrediction returns a mock NextFeedPrediction
// TODO: Replace with real prediction algorithm
func GetMockPrediction() *model.NextFeedPrediction {
	now := time.Now()
	predictedTime := now.Add(2 * time.Hour) // 2 hours from now

	return &model.NextFeedPrediction{
		PredictedTime:    predictedTime,
		Confidence:       model.PredictionConfidenceHigh,
		MinutesUntilFeed: 120,
		Reasoning:        stringPtr("Based on 70ml feed at 2:00 PM, typically goes 3 hours between feeds"),
	}
}
