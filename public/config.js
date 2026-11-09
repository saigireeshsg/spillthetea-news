// Public Supabase settings (safe to expose; access is limited by row-level security).
// Fill these in from Supabase → Project Settings → API.
window.SPILL_CONFIG = {
  // Live map tiles (CARTO). Central switches: set mapTiles:false to go list-only; paste CARTO key into cartoKey (public by nature: restrict it to spillthetea.news in the CARTO dashboard).
  mapTiles: true,
  // Reddit sign-in: public client id of your Reddit "web app" (redirect uri https://spillthetea.news/). Secret lives in Supabase function secrets, never here.
  redditClientId: "",
  cartoKey: "cb1_55hv_1_9dcc8a32171e6d00477668b3",
  speakup: false, // 📣 Speak up (civic actions) tab + "Take part" boxes; set true to show again
  // PostHog: Project settings → Project API key (starts with phc_). Host: us.i.posthog.com or eu.i.posthog.com
  posthogKey: "phc_sa3vuQTENx8XM4iLXqcyYcLFTWaXHS2VPaAVJdm5owcw",
  posthogHost: "https://us.i.posthog.com",
  supabaseUrl: "https://tvhfqkvyfkqxxiqxavjp.supabase.co",
  vapidPublicKey: "BFgeM8ZhBtvn-SXaaEMAaKJqwAm4uA3OSg4US6BxGAeHJut71yUAEzSJ-NXZP1Bui52qSRQkzjdPFwIhQCETpkU",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aGZxa3Z5ZmtxeHhpcXhhdmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mjk5NzcsImV4cCI6MjEwODQwNTk3N30.kdr_HGk0Lx5VXEy_TchDK8XuUCh0TqsgER_7vyZuw6o"
};
