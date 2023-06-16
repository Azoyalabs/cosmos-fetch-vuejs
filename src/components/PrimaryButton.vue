
<template>
    <button v-bind="$attrs" @click="$emit('click')">
        <slot></slot>
    </button>
</template>



<style scoped>
button {
    padding: 0.4rem 0.8rem 0.4rem 0.8rem;
    border-radius: 1.2rem;
    background-color: hsla(160, 100%, 37%, 1);
    box-shadow: none;
    border: none;
}
</style>