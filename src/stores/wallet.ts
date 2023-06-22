import { CHAIN_ID, REGISTRY_CHAIN_NAME } from '@/constants'
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { QueryClient, StargateClient, setupIbcExtension, type IbcExtension } from '@cosmjs/stargate'
import type { OfflineAminoSigner } from '@keplr-wallet/types'
import { chains } from 'chain-registry'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Tendermint34Client } from '@cosmjs/tendermint-rpc'

const rpc = chains.find((c) => c.chain_name === REGISTRY_CHAIN_NAME)!.apis!.rpc![0].address

export const useSignerStore = defineStore('wallet', () => {
  const signer = ref<OfflineAminoSigner | null>(null)
  const isConnected = computed(() => signer.value !== null)

  async function connectToWallet() {
    if (window.keplr) {
      await window.keplr.enable([CHAIN_ID])
      signer.value = window.keplr.getOfflineSigner(CHAIN_ID)
    }
  }

  return { signer, isConnected, connectToWallet }
})

export const useQueryStore = defineStore('queryStore', () => {
  const stargateClient = ref(StargateClient.connect(rpc))
  const wasmClient = ref(CosmWasmClient.connect(rpc))

  return { stargateClient, wasmClient }
})

export const useTendermintQueryClient = defineStore('tendermintQueryClient', () => {
  const queryClient = ref<IbcExtension | null>(null)

  async function initialize() {
    const tm = await Tendermint34Client.connect(rpc)
    queryClient.value = setupIbcExtension(new QueryClient(tm))
  }

  async function useInitializedClient() {
    if (queryClient.value) {
      return queryClient.value
    } else {
      await initialize()
      return queryClient.value!
    }
  }

  return { useInitializedClient, initialize }
})
