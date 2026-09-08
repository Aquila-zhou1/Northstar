<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from '../components/AuthShell.vue';
import { useAuth } from '../composables/useAuth';
import { authErrorMessage, safeRedirect } from '../utils/authErrors';

const props = defineProps({
  intent: { type: String, required: true, validator: value => ['signup', 'login'].includes(value) }
});

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const email = ref('');
const pending = ref(false);
const errorMessage = ref('');
const isSignup = computed(() => props.intent === 'signup');
const sessionNotice = computed(() => route.query.reason === 'session-expired'
  ? 'Your session expired. Log in again to continue.'
  : '');

async function submit() {
  if (pending.value) return;
  pending.value = true;
  errorMessage.value = '';
  try {
    const normalizedEmail = await auth.requestEmailOtp(email.value, props.intent);
    await router.push({
      name: 'verify',
      query: {
        intent: props.intent,
        email: normalizedEmail,
        redirect: safeRedirect(route.query.redirect)
      }
    });
  } catch (error) {
    errorMessage.value = authErrorMessage(
      error,
      'We could not send a code for this request. Check the email and try again.'
    );
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <AuthShell>
    <p class="auth-eyebrow">{{ isSignup ? 'Create your workspace' : 'Welcome back' }}</p>
    <h1 class="auth-title">{{ isSignup ? 'Start planning clearly.' : 'Continue your plan.' }}</h1>
    <p class="auth-copy">Enter your email and we’ll send you a six-digit verification code. No password needed.</p>
    <p v-if="sessionNotice" class="form-notice" role="status">{{ sessionNotice }}</p>

    <form class="auth-form" @submit.prevent="submit">
      <div class="field">
        <label for="authEmail">Email address</label>
        <input id="authEmail" v-model.trim="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required autofocus />
      </div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="primary-btn auth-submit" type="submit" :disabled="pending">
        {{ pending ? 'Sending…' : 'Send verification code' }}
      </button>
    </form>

    <p class="auth-switch">
      {{ isSignup ? 'Already have an account?' : 'New to Northstar?' }}
      <RouterLink :to="isSignup ? '/login' : '/signup'">{{ isSignup ? 'Log in' : 'Sign up' }}</RouterLink>
    </p>
  </AuthShell>
</template>
