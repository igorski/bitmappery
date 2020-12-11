<template>
    <div class="toolbox">
        <h2 v-t="'toolbox'"></h2>
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

.toolbox {
    @include component();
}
</style>
