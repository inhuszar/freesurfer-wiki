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
          name: "Fraunces",
          weights: [400, 500, 600],
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
          light: "#faf6f0",        // warm paper background
          lightgray: "#e8ddc8",    // borders & rules
          gray: "#8a7e6c",         // secondary text
          darkgray: "#3a3428",     // body text
          dark: "#1a1612",         // headings
          secondary: "#2a3f7a",    // primary accent (deep indigo)
          tertiary: "#b85c3a",     // hover accent (terracotta)
          highlight: "rgba(184, 92, 58, 0.08)",
          textHighlight: "#f5c75555",
        },
        darkMode: {
          light: "#1c1814",        // warm dark background
          lightgray: "#3a3228",
          gray: "#7a7062",
          darkgray: "#d8cfbf",     // body text
          dark: "#f0e7d5",         // headings
          secondary: "#8ea4d9",    // primary accent (lighter indigo)
          tertiary: "#e89770",     // hover accent (lighter terracotta)
          highlight: "rgba(232, 151, 112, 0.12)",
          textHighlight: "#f5c75533",
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
