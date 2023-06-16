import { CHAIN_ID, REGISTRY_CHAIN_NAME } from '@/constants'
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { QueryClient, StargateClient, setupIbcExtension, type IbcExtension } from '@cosmjs/stargate'
import type { OfflineAminoSigner } from '@keplr-wallet/types'
import { chains } from 'chain-registry'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Tendermint34Client } from '@cosmjs/tendermint-rpc'

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

export const useQueryClient = defineStore('queryClient', () => {
  const queryClient = ref<StargateClient | null>(null)

  async function initialize() {
    const rpc = chains.find((c) => c.chain_name === REGISTRY_CHAIN_NAME)!.apis!.rpc![0].address

    queryClient.value = await StargateClient.connect(rpc)
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

export const useWasmQueryClient = defineStore('wasmQueryClient', () => {
  const queryClient = ref<CosmWasmClient | null>(null)

  async function initialize() {
    const rpc = chains.find((c) => c.chain_name === REGISTRY_CHAIN_NAME)!.apis!.rpc![0].address

    queryClient.value = await CosmWasmClient.connect(rpc)
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

export const useTendermintQueryClient = defineStore('tendermintQueryClient', () => {
  const queryClient = ref<IbcExtension | null>(null)

  async function initialize() {
    const rpc = chains.find((c) => c.chain_name === REGISTRY_CHAIN_NAME)!.apis!.rpc![0].address

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
