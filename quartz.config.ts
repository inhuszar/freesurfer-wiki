import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
 const config: QuartzConfig = {
  configuration: {
    pageTitle: "FreeSurfer Documentation",
    pageTitleSuffix: " — FDP",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "inhuszar.github.io/freesurfer-wiki",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: {
          name: "Source Sans 3",
          weights: [400, 500, 600, 700],
          includeItalic: true,
        },
        body: {
          name: "Source Sans 3",
          weights: [400, 500, 600],
          includeItalic: true,
        },
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#ffffff",        // white background
          lightgray: "#e5e7eb",    // borders & rules
          gray: "#6b7280",         // secondary/muted text
          darkgray: "#374151",     // body text
          dark: "#111827",         // headings
          secondary: "#0a7d91",    // primary accent (NumPy teal)
          tertiary: "#4dabcf",     // hover accent (NumPy cyan)
          highlight: "rgba(10, 125, 145, 0.08)",
          textHighlight: "#fef08a",
        },
        darkMode: {
          light: "#0d1117",        // GitHub dark bg
          lightgray: "#30363d",
          gray: "#8b949e",
          darkgray: "#c9d1d9",     // body text
          dark: "#e6edf3",         // headings
          secondary: "#4dabcf",    // primary accent (NumPy cyan, inverted)
          tertiary: "#7bc1d8",     // hover
          highlight: "rgba(77, 171, 207, 0.12)",
          textHighlight: "#bf8700",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
