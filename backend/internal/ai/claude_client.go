package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type ClaudeClient struct {
	apiKey     string
	httpClient *http.Client
}

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func NewClaudeClient(apiKey string) *ClaudeClient {
	if apiKey == "" {
		apiKey = os.Getenv("CLAUDE_API_KEY")
	}
	
	return &ClaudeClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *ClaudeClient) ParseVoiceInput(text string, currentTime time.Time, timezone string) (string, error) {
	prompt := buildVoiceParsingPrompt(text, currentTime, timezone)
	
	reqBody := claudeRequest{
		Model:     "claude-sonnet-4-6",
		MaxTokens: 2000,
		Messages: []claudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	var claudeResp claudeResponse
	maxRetries := 3
	for attempt := range maxRetries {
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("failed to call Claude API: %w", err)
		}

		if resp.StatusCode == 429 || resp.StatusCode == 529 {
			resp.Body.Close()
			if attempt < maxRetries-1 {
				time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
				req, _ = http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("x-api-key", c.apiKey)
				req.Header.Set("anthropic-version", "2023-06-01")
				continue
			}
			return "", fmt.Errorf("Claude API overloaded after %d retries", maxRetries)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return "", fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, string(body))
		}

		if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
			resp.Body.Close()
			return "", fmt.Errorf("failed to decode response: %w", err)
		}
		resp.Body.Close()
		break
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no content in Claude response")
	}

	return claudeResp.Content[0].Text, nil
}

func buildVoiceParsingPrompt(voiceText string, currentTime time.Time, timezone string) string {
	// Convert current time to the user's timezone so Claude sees the correct local time
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	localTime := currentTime.In(loc)

	return fmt.Sprintf(`You are parsing baby care voice input into structured activities.

Current local time: %s
Timezone: %s

Voice input: "%s"

Rules:
1. "now" or "right now" = current local time
2. Relative times like "at 2:30" are absolute within today in the user's timezone
3. Default feed type to "FORMULA" if not specified (for liquid feeds)
4. "pooped" means had_poop=true for diaper change
5. "peed" means had_pee=true for diaper change
6. ALL timestamps MUST use the user's timezone offset (e.g. -05:00), NEVER use "Z"
7. If the caregiver mentions solid food (e.g. carrots, avocado, banana, rice cereal, puree), set feed_type to "SOLIDS". Extract food_name, quantity, and quantity_unit if mentioned.

FEED ACTIVITIES (FORMULA/BREAST_MILK):
- MUST have: start_time, amount_ml, feed_type
- amount_ml should be set; food_name/quantity/quantity_unit should be null
- If end_time provided: use it
- If end_time NOT provided: set to null (will auto-calculate as start_time + 45 minutes)

FEED ACTIVITIES (SOLIDS):
- MUST have: start_time, feed_type ("SOLIDS"), food_name
- quantity and quantity_unit are optional (use if mentioned)
- quantity_unit must be one of: "SPOONS", "BOWLS", "PIECES", "PORTIONS"
- amount_ml should be null for solids
- If end_time provided: use it
- If end_time NOT provided: set to null

SLEEP ACTIVITIES:
- MUST have: start_time
- If end_time provided: use it (completed nap)
- If end_time NOT provided: set to null (ongoing/active sleep)

DIAPER ACTIVITIES:
- MUST have: changed_at timestamp
- Extract had_poop and had_pee from context

Extract all activities mentioned. Return ONLY valid JSON array (no markdown, no explanation):

[
  {
    "activity_type": "FEED",
    "feed_details": {
      "start_time": "2024-01-15T14:30:00-05:00",
      "end_time": null,
      "amount_ml": 60,
      "feed_type": "FORMULA",
      "food_name": null,
      "quantity": null,
      "quantity_unit": null
    }
  },
  {
    "activity_type": "FEED",
    "feed_details": {
      "start_time": "2024-01-15T12:00:00-05:00",
      "end_time": null,
      "amount_ml": null,
      "feed_type": "SOLIDS",
      "food_name": "mushed carrots",
      "quantity": 10,
      "quantity_unit": "SPOONS"
    }
  },
  {
    "activity_type": "DIAPER",
    "diaper_details": {
      "changed_at": "2024-01-15T14:55:00-05:00",
      "had_poop": true,
      "had_pee": true
    }
  },
  {
    "activity_type": "SLEEP",
    "sleep_details": {
      "start_time": "2024-01-15T15:00:00-05:00",
      "end_time": null
    }
  }
]

If you cannot parse the input, return: {"error": "reason"}`,
		localTime.Format(time.RFC3339),
		timezone,
		voiceText,
	)
}