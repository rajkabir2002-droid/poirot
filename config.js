// Poirot settings. Fill these two values from Supabase (see SETUP.md, step 4).
// supabaseKey is the PUBLISHABLE key (older projects call it the "anon" key). It is safe to publish:
// it only allows what the database rules allow. Never put the secret or service_role key here.
// Leave both empty and Poirot runs in demo mode only.
window.POIROT_CONFIG = {
  supabaseUrl: "",
  supabaseKey: ""
};
