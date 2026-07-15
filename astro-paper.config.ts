import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://astro-paper.pages.dev/",
    title: "Johith Iype",
    description: "Johith's Blog",
    author: "Johith Iype",
    profile: "https://johith.com",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/Toronto",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: false,
    showBackButton: true,
    editPost: {
      enabled: false
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/johiype" },
   // { name: "x",        url: "https://x.com/username" },
    { name: "linkedin", url: "https://ca.linkedin.com/in/johith" },
    { name: "mail",     url: "mailto:mail@johith.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
