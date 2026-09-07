<script setup>
import { computed } from 'vue';
import { formatDate } from '../domain/planner';

const props = defineProps({
  projectName: { type: String, required: true },
  projectDescription: { type: String, required: true },
  overall: { type: Number, required: true },
  completed: { type: Number, required: true },
  total: { type: Number, required: true },
  dueSoon: { type: Number, required: true }
});

const trend = computed(() => props.overall >= 70 ? 'Nearly there' : props.overall >= 35 ? 'On the move' : 'Getting started');
</script>

<template>
  <section class="overview" aria-labelledby="project-title">
    <div>
      <p class="eyebrow">Active project · {{ formatDate(new Date().toISOString().slice(0, 10)) }}</p>
      <h1 id="project-title">{{ projectName }}</h1>
      <p class="overview-copy">{{ projectDescription }}</p>
    </div>
    <aside class="progress-panel" aria-label="Project progress">
      <div class="progress-top">
        <div><div class="progress-label">Overall progress</div><div class="progress-number">{{ overall }}%</div></div>
        <div class="trend">{{ trend }}</div>
      </div>
      <div class="meter"><span :style="{ width: `${overall}%` }"></span></div>
      <div class="progress-meta">
        <span><b>{{ completed }}</b> completed</span>
        <span><b>{{ total - completed }}</b> remaining</span>
        <span><b>{{ dueSoon }}</b> due soon</span>
      </div>
    </aside>
  </section>
</template>
