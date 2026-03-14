// =============================================================================
// About Page
// Information about the Star Finder application
// =============================================================================

"use client";

import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { ModelSelector } from "@/components/settings/model-selector";
import { FontSizeSelector } from "@/components/settings/font-size-selector";

export default function AboutPage() {
  const { theme, model, fontSize } = useSettings();

  return (
    <main className="container max-w-2xl mx-auto py-12 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Star Finder</h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered GitHub Repository Assistant
          </p>
        </div>

        <Separator />

        {/* About Content */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Find relevant repositories from your GitHub stars using natural language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Star Finder helps you discover and organize your GitHub starred repositories
              through an intuitive AI-powered conversational interface. Simply describe what
              you&apos;re looking for, and let AI find the most relevant repositories from your
              collection.
            </p>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>Natural language repository search</li>
                  <li>Progressive disclosure of details</li>
                  <li>Privacy-first (local storage)</li>
                  <li>Multiple AI model support</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Tech Stack</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>Next.js 16</li>
                  <li>Mastra AI</li>
                  <li>OpenRouter</li>
                  <li>Tailwind CSS v4</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Current Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
            <CardDescription>
              Your personalized configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">AI Model</span>
              <div>
                <ModelSelector className="w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Font Size</span>
              <div>
                <FontSizeSelector className="w-full" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Theme:</strong> {theme}
              </p>
              <p>
                <strong>Model:</strong> {model}
              </p>
              <p>
                <strong>Font Size:</strong> {fontSize}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Version Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Version 1.0.0</p>
          <p className="mt-1">Built with Next.js and Mastra</p>
        </div>
      </div>
    </main>
  );
}
