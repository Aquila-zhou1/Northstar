<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from '../components/AuthShell.vue';
import { useAuth } from '../composables/useAuth';
import { authErrorMessage, safeRedirect } from '../utils/authErrors';

const RESEND_COOLDOWN_SECONDS = 60;
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const email = computed(() => String(route.query.email || ''));
const intent = computed(() => route.query.intent === 'signup' ? 'signup' : 'login');
const token = ref('');
const pending = ref(false);
const resendPending = ref(false);
const errorMessage = ref('');
const noticeMessage = ref('');
const cooldown = ref(RESEND_COOLDOWN_SECONDS);

const timer = window.setInterval(() => {
  if (cooldown.value > 0) cooldown.value -= 1;
}, 1000);

onBeforeUnmount(() => window.clearInterval(timer));

function normalizeToken() {
  token.value = token.value.replace(/\D/g, '').slice(0, 6);
}

async function verify() {
  normalizeToken();
  if (pending.value || token.value.length !== 6) return;
  pending.value = true;
  errorMessage.value = '';
  noticeMessage.value = '';
  try {
    await auth.verifyEmailOtp(email.value, token.value);
    await router.replace(safeRedirect(route.query.redirect));
  } catch (error) {
    errorMessage.value = authErrorMessage(error, 'That verification code could not be verified. Try again.');
  } finally {
    pending.value = false;
  }
}

async function resend() {
  if (resendPending.value || cooldown.value > 0) return;
  resendPending.value = true;
  errorMessage.value = '';
  noticeMessage.value = '';
  try {
    await auth.requestEmailOtp(email.value, intent.value);
    cooldown.value = RESEND_COOLDOWN_SECONDS;
    noticeMessage.value = 'A new verification code has been sent.';
  } catch (error) {
    errorMessage.value = authErrorMessage(error, 'We could not resend the code. Try again shortly.');
  } finally {
    resendPending.value = false;
  }
}
</script>

<template>
  <AuthShell>
    <p class="auth-eyebrow">Check your inbox</p>
    <h1 class="auth-title">Enter your code.</h1>
    <p class="auth-copy">We sent a six-digit verification code to <strong>{{ email }}</strong>.</p>

    <form class="auth-form" @submit.prevent="verify">
      <div class="field">
        <label for="verificationCode">Verification code</label>
        <input
          id="verificationCode"
          v-model="token"
          class="otp-input"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]{6}"
          maxlength="6"
          placeholder="000000"
          required
          autofocus
          @input="normalizeToken"
        />
      </div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <p v-if="noticeMessage" class="form-notice" role="status">{{ noticeMessage }}</p>
      <button class="primary-btn auth-submit" type="submit" :disabled="pending || token.length !== 6">
        {{ pending ? 'Verifying…' : 'Verify and continue' }}
      </button>
    </form>

    <div class="verify-actions">
      <button class="text-btn" type="button" :disabled="cooldown > 0 || resendPending" @click="resend">
        {{ resendPending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code' }}
      </button>
      <RouterLink class="text-link" :to="intent === 'signup' ? '/signup' : '/login'">Use a different email</RouterLink>
    </div>
  </AuthShell>
</template>
