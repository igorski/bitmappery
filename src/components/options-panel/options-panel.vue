<template>
    <div class="options-panel">
        <h2 v-t="'optionsPanel'"></h2>
    </div>
</template>

<script>
import messages from './messages.json';
export default {
    i18n: { messages },
};
</script>

<style lang="scss" scoped>
@import "@/styles/component";

.options-panel {
    @include component();
}
</style>
