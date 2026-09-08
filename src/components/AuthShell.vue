<template>
  <div class="auth-shell">
    <RouterLink class="auth-brand" to="/" aria-label="Northstar home">
      <span class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m15.3 8.7-2.1 4.5-4.5 2.1 2.1-4.5 4.5-2.1Z" />
        </svg>
      </span>
      <span class="brand-name">Northstar</span>
    </RouterLink>
    <main class="auth-main">
      <section class="auth-card">
        <slot />
      </section>
      <p class="auth-security-note">Private by default · Your plans stay tied to your account</p>
    </main>
  </div>
</template>
