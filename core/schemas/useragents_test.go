package schemas

import "testing"

func TestDetectAppFromUserAgent(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
		want      string
	}{
		{name: "claude cli versioned", userAgent: "claude-cli/2.1.168 (external, cli)", want: "Claude Code"},
		{name: "claude code contains", userAgent: "external claude-code/1.0", want: "Claude Code"},
		{name: "codex cli", userAgent: "codex-cli/0.1.0", want: "Codex"},
		{name: "codex tui", userAgent: "codex-tui/0.1.0", want: "Codex"},
		{name: "cursor", userAgent: "Cursor/0.47", want: "Cursor"},
		{name: "gemini", userAgent: "gemini-cli/1.0", want: "Gemini CLI"},
		{name: "qwen", userAgent: "qwen-code/1.0", want: "Qwen Code"},
		{name: "opencode", userAgent: "opencode/1.0", want: "OpenCode"},
		{name: "windsurf", userAgent: "Windsurf/1.0", want: "Windsurf"},
		{name: "kilo before cline", userAgent: "kilo-cline/1.0", want: "Kilo Code"},
		{name: "roo before cline", userAgent: "roo-cline/1.0", want: "Roo Code"},
		{name: "unknown", userAgent: "custom-client/1.0", want: "Other"},
		{name: "empty", userAgent: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DetectAppFromUserAgent(tt.userAgent); got != tt.want {
				t.Fatalf("DetectAppFromUserAgent(%q) = %q, want %q", tt.userAgent, got, tt.want)
			}
		})
	}
}

func TestMatchUserAgent(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
		pattern   string
		matchType UserAgentMappingMatchType
		want      bool
	}{
		{name: "contains", userAgent: "claude-cli/2.1.168 (external, cli)", pattern: "CLI/2.1", matchType: UserAgentMappingMatchTypeContains, want: true},
		{name: "starts with", userAgent: "claude-cli/2.1.168", pattern: "Claude-CLI", matchType: UserAgentMappingMatchTypeStartsWith, want: true},
		{name: "exact", userAgent: "Cursor/1.0", pattern: "cursor/1.0", matchType: UserAgentMappingMatchTypeExact, want: true},
		{name: "regex", userAgent: "custom-client/42", pattern: `custom-client/\d+`, matchType: UserAgentMappingMatchTypeRegex, want: true},
		{name: "invalid regex", userAgent: "custom-client/42", pattern: `[`, matchType: UserAgentMappingMatchTypeRegex, want: false},
		{name: "unknown match type", userAgent: "custom-client/42", pattern: "custom", matchType: UserAgentMappingMatchType("bad"), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchUserAgent(tt.userAgent, tt.pattern, tt.matchType); got != tt.want {
				t.Fatalf("MatchUserAgent(%q, %q, %q) = %v, want %v", tt.userAgent, tt.pattern, tt.matchType, got, tt.want)
			}
		})
	}
}
