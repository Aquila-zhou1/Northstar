import { computed, ref } from 'vue';
import { supabase } from '../services/supabaseClient';

const session = ref(null);
const initialized = ref(false);
let initialization;
let authSubscription;

async function ensureInitialized() {
  if (initialized.value) return;
  if (initialization) return initialization;

  initialization = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    session.value = data.session;

    if (!authSubscription) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession;
      });
      authSubscription = listener.subscription;
    }
    initialized.value = true;
  })();

  try {
    await initialization;
  } finally {
    initialization = null;
  }
}

async function requestEmailOtp(email, intent) {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: intent === 'signup' }
  });
  if (error) throw error;
  return normalizedEmail;
}

async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email'
  });
  if (error) throw error;
  session.value = data.session;
  return data.session;
}

async function signOut(scope = 'global') {
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw error;
  session.value = null;
}

const user = computed(() => session.value?.user ?? null);
const isAuthenticated = computed(() => Boolean(session.value));

export function useAuth() {
  return {
    session,
    user,
    initialized,
    isAuthenticated,
    ensureInitialized,
    requestEmailOtp,
    verifyEmailOtp,
    signOut
  };
}
