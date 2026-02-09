package ai

import (
	"context"
	"fmt"
	"io"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

type WhisperClient struct {
	client *openai.Client
}

func NewWhisperClient() *WhisperClient {
	// NewClient() reads OPENAI_API_KEY from environment automatically
	client := openai.NewClient(option.WithMaxRetries(3))

	return &WhisperClient{
		client: &client,
	}
}

// TranscribeAudio sends an audio file to OpenAI Whisper API and returns the transcribed text
func (w *WhisperClient) TranscribeAudio(ctx context.Context, audioData io.Reader, filename string) (string, error) {
	// Create transcription request with filename for format detection
	transcription, err := w.client.Audio.Transcriptions.New(ctx, openai.AudioTranscriptionNewParams{
		Model: openai.AudioModelWhisper1,
		File:  openai.File(audioData, filename, ""),
	})

	if err != nil {
		return "", fmt.Errorf("failed to transcribe audio: %w", err)
	}

	return transcription.Text, nil
}
