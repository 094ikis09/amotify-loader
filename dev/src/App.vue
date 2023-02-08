<template>
    <a-app>
        <a-container>
            <a-alert>Alert</a-alert>
            <a-card v-ripple>
                <div style="text-align: center">
                    <a-img src="/amotify.png" style="display: inline-flex"></a-img>
                </div>
                <a-card-text>
                    <a-text-field></a-text-field>
                    <a-btn></a-btn>
                </a-card-text>
            </a-card>

            <Pug />
            <External />
            <Setup />
        </a-container>
    </a-app>
</template>

<script>
import Pug from './pug.vue'
import External from './external.vue'
import Setup from './setup.vue'
export default {
    components: { Pug, External, Setup },
    data: () => ({})
}
</script>

<style lang="scss">
.a-container {
    outline: 1px solid red;
}
</style>