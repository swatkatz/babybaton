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
		Model:     "claude-sonnet-4-20250514",
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

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Claude API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, string(body))
	}

	var claudeResp claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no content in Claude response")
	}

	return claudeResp.Content[0].Text, nil
}

func buildVoiceParsingPrompt(voiceText string, currentTime time.Time, timezone string) string {
	return fmt.Sprintf(`You are parsing baby care voice input into structured activities.

Current time: %s
Current timezone: %s

Voice input: "%s"

Rules:
1. "now" or "right now" = current time
2. Relative times like "at 2:30" are absolute within today
3. Default feed type to "FORMULA" if not specified
4. "pooped" means had_poop=true for diaper change
5. "peed" means had_pee=true for diaper change

FEED ACTIVITIES:
- MUST have: start_time, amount_ml, feed_type
- If end_time provided: use it
- If end_time NOT provided: set to null (will auto-calculate as start_time + 45 minutes)

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
    "activity_type": "FEED|DIAPER|SLEEP",
    "feed_details": {
      "start_time": "2024-01-15T14:30:00Z",
      "end_time": null,
      "amount_ml": 60,
      "feed_type": "FORMULA"
    },
    "diaper_details": {
      "changed_at": "2024-01-15T14:55:00Z",
      "had_poop": true,
      "had_pee": true
    },
    "sleep_details": {
      "start_time": "2024-01-15T15:00:00Z",
      "end_time": null
    }
  }
]

If you cannot parse the input, return: {"error": "reason"}`, 
		currentTime.Format(time.RFC3339), 
		timezone, 
		voiceText,
	)
}