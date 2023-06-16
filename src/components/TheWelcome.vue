<script setup lang="ts">
import ExplainContainer from './ExplainContainer.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import BalanceList from './BalanceList.vue'
import { useSignerStore, useQueryClient, useWasmQueryClient, useTendermintQueryClient } from '@/stores/wallet'
import type { AccountData } from "@keplr-wallet/types"
import { onBeforeMount, ref, type Ref, watch } from 'vue'
import type { Coin } from '@cosmjs/stargate'
import { assets } from 'chain-registry';
import { CHAIN_NAME, REGISTRY_CHAIN_NAME } from '@/constants'
import { LUNA_CW20_ADDRESS, LUNA_CW20_OWNER_ADDRESS, FNS_NFT_ADDRESS, FNS_NFT_TOKEN_ID } from "@/constants";
import PrimaryButtonVue from './PrimaryButton.vue'
import type { DenomTrace } from "cosmjs-types/ibc/applications/transfer/v1/transfer";


/* Stores */
const signerStore = useSignerStore();
const queryClientStore = useQueryClient();
const cosmwasmQueryClient = useWasmQueryClient();
const tendermintQueryClient = useTendermintQueryClient();


const accountDatas: Ref<readonly AccountData[] | null> = ref(null);
const balances: Ref<readonly Coin[] | null> = ref(null);
const smartBalances: Ref<readonly Coin[] | null> = ref(null);
const cw20Info: Ref<{ name: string, symbol: string, balance: number } | null> = ref(null);
const ibcDenoms: Ref<DenomTrace[] | null> = ref(null)
const chainAssets = assets.find((a) => a.chain_name === REGISTRY_CHAIN_NAME)!.assets;


onBeforeMount(async () => {
  if (signerStore.signer) {
    accountDatas.value = await signerStore.signer.getAccounts()
  }
  const client = await tendermintQueryClient.useInitializedClient();
  const { denomTraces } = await client.ibc.transfer.allDenomTraces();
  ibcDenoms.value = denomTraces;

})


signerStore.$subscribe(async (mutation, state) => {
  if (state.signer) {
    accountDatas.value = await state.signer.getAccounts()
  }
})

watch(accountDatas, async (accs) => {
  if (accs) {
    const initializedClient = await queryClientStore.useInitializedClient();
    balances.value =
      await initializedClient.getAllBalances(accs[0].address)

    smartBalances.value = balances.value.map((b) => {
      return {
        ...
        findAssetFromDenom(b.denom),
        ...b
      }
    }).map((c) => {
      // NOTE: chain-registry is misconfigured for atestfet
      const decimals = c.denom_units?.find((d) => d.denom === c.display || d.denom === "testfet")?.exponent ?? 1;
      return {
        amount: (Math.pow(10, -decimals) * parseInt(c.amount)).toString(),
        denom: c.display ?? c.denom
      }

    })
  }
})

function findAssetFromDenom(denom: string) {
  return chainAssets.find((c) => c.base === denom) ?? null
}


async function fetchCW20Balance() {
  const client = await cosmwasmQueryClient.useInitializedClient();

  const { balance }: { balance: string } = await client.queryContractSmart(LUNA_CW20_ADDRESS, {
    "balance": {
      "address": LUNA_CW20_OWNER_ADDRESS
    }
  })


  const tokenInfo: {
    "name": string,
    "symbol": string,
    "decimals": number,
    "total_supply": string
  }
    = await client.queryContractSmart(LUNA_CW20_ADDRESS, {
      "token_info": {
      }
    })

  return {
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    balance: parseInt(balance) * Math.pow(10, -tokenInfo.decimals)
  }

}

let cw721Info: Ref<{
  name: string,
  owner: string,
  symbol: string,
  image: string,
  description: string
} | null> = ref(null);
async function fetchCW721Info() {
  const client = await cosmwasmQueryClient.useInitializedClient();

  const { name, symbol }: {
    "name": string,
    "symbol": string
  } = await client.queryContractSmart(FNS_NFT_ADDRESS, {
    "contract_info": {
    }
  })


  const tokenInfo:
    {
      access: { owner: string, approvals: string[] },
      info:
      {
        extension: {
          image: string
          description: string
        }
      }
    } = await client.queryContractSmart(FNS_NFT_ADDRESS, {
      "all_nft_info": {
        "token_id": FNS_NFT_TOKEN_ID
      }
    })

  return {
    name,
    owner: tokenInfo.access.owner,
    symbol: symbol,
    image: tokenInfo.info.extension.image,
    description: tokenInfo.info.extension.description
  }

}
</script>

<template>
  <ExplainContainer>
    <template #icon>
      <DocumentationIcon />
    </template>
    <template #heading>Wallet Connection</template>

    <div v-if="signerStore.isConnected">
      <div>
        Your connected wallet address is:
      </div>
      <div v-if="accountDatas">

        <div v-for="accountData in accountDatas" :key="accountData.address" class="address">
          {{ accountData.address }}
        </div>
      </div>
    </div>
    <div v-else>
      <PrimaryButtonVue @click="signerStore.connectToWallet">
        Connect to your fetch wallet
      </PrimaryButtonVue>
    </div>
    <div class="mt-2">
      Your crypto address is a unique identifier, it is used to receive and send messages, interact with the network and
      handle funds.
    </div>
  </ExplainContainer>

  <ExplainContainer>
    <template #icon>
      <ToolingIcon />
    </template>
    <template #heading>Bank Balances</template>

    An address' balances can be queried using the Stargate or CosmWasm client. These balances are raw and you'll need to
    take into account both the decimals and the actual token denomination to display something comprehensible to the
    users. Your own balances will be shown after connecting your wallet.

    <div v-if="balances">

      <BalanceList :balances="[...balances]" :title="'Raw Balances'"></BalanceList>

      <BalanceList :balances="[...smartBalances]" :title="'Parsed Balances'"></BalanceList>
    </div>
    <br />

    These balances will also include Interchain tokens, most commonly known as IBC tokens. You'll be able to spot them
    thanks to their special denomination as it starts with <code>ibc</code>.<br />


    <div v-if="ibcDenoms">
      <h4>The {{ CHAIN_NAME }} network handles {{ ibcDenoms.length }} such assets.</h4>

      <div v-if="ibcDenoms.length > 0" class="mt-2">
        These are:
        <ul>
          <li v-for="ibc in ibcDenoms" :key="ibc.baseDenom">
            <span class="symbol">{{ ibc.baseDenom }}</span> using the ibc path {{ ibc.path }}
          </li>
        </ul>
      </div>
    </div>

    <br />
    Any time you find yourself dealing with such a denomination, you can use the
    <code>ibc extension for the tendermint client and its ibc.transfer.denomTrace</code> to translate it into one of the
    human readable symbol, we've just shown.
    Token informations can usually be found in the <a href="https://github.com/cosmos/chain-registry">chain registry
      repository</a>.
  </ExplainContainer>

  <ExplainContainer>
    <template #icon>
      <CommunityIcon />
    </template>
    <template #heading>Smart contract - Token (CW20)</template>
    The Cosmos ecosystem has its own version of the ERC20 token standard from EVM chains. These are treated differently
    from native denominations and require CosmWasm and a CosmWasm client to be interacted with.<br />
    Contrary to Native denominations, CW20 includes optional marketing info fields.
    <div class="mt-2">Balance for <span class="address">{{ LUNA_CW20_OWNER_ADDRESS }}</span> on the sample <span
        class="address">{{
          LUNA_CW20_ADDRESS }}</span> token:</div>
    <div class="mt-2">
      <div v-if="cw20Info">
        <div>
          <div>
            <div>
              {{ cw20Info.name }}
            </div>

            <div>
              {{ cw20Info.balance.toFixed(5) }}
              <span class="symbol">
                {{ cw20Info.symbol }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <PrimaryButtonVue @click="async () => { cw20Info = await fetchCW20Balance() }">
          Query balance
        </PrimaryButtonVue>
      </div>
    </div>
  </ExplainContainer>

  <ExplainContainer>
    <template #icon>
      <CommunityIcon />
    </template>
    <template #heading>Smart contract - NFT (CW721)</template>

    <div>
      Just like the CW20 standard, the CW721 standard is inspired by the EVM one. You can query any NFT collection, its
      information and all of its individual tokens using a CosmWasm compatible client.

      <div class="mt-2">NFT Info for <span class="symbol">{{ FNS_NFT_TOKEN_ID }}</span> from the <span class="address">{{
        FNS_NFT_ADDRESS }}</span> collection.</div>

    </div>

    <div class="mt-2">
      <div v-if="cw721Info">
        <div class="nft__container">
          <div class="placeholder">
            <img :src="cw721Info.image" />
          </div>
          <div class="">
            <div class="nft__container-title">
              {{ cw721Info.name }}
              <span class="symbol">
                ({{ cw721Info.symbol }})
              </span>
            </div>

            <div>
              <div>
                <h5>Owner</h5>
                {{ cw721Info.owner }}
              </div>
              <div>
                <h5>Description</h5>

                {{ cw721Info.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <PrimaryButtonVue @click="async () => { cw721Info = await fetchCW721Info() }">
          Query NFT info
        </PrimaryButtonVue>
      </div>
    </div>
  </ExplainContainer>


  <ExplainContainer>
    <template #icon>
      <EcosystemIcon />
    </template>
    <template #heading>Ecosystem</template>

    Get official tools and libraries for your project:
    <a href="https://pinia.vuejs.org/" target="_blank" rel="noopener">Pinia</a>,
    <a href="https://router.vuejs.org/" target="_blank" rel="noopener">Vue Router</a>,
    <a href="https://test-utils.vuejs.org/" target="_blank" rel="noopener">Vue Test Utils</a>, and
    <a href="https://github.com/vuejs/devtools" target="_blank" rel="noopener">Vue Dev Tools</a>. If
    you need more resources on developing for Cosmos chains, we suggest paying
    <a href="https://github.com/cosmos/awesome-cosmos" target="_blank" rel="noopener">Awesome Cosmos</a>
    a visit.

    <br />You can also discover innovative projects on the Fetch.ai blockchain on their <a
      href="https://fetch.ai/ecosystem/" target="_blank" rel="noopener">ecosystem page</a>.
  </ExplainContainer>
</template>


<style>
.nft__container {
  display: flex;
  margin-top: 1rem;
}


.nft__container-title {
  font-size: large;
  color: var(--color-heading);
  font-weight: 500;
}

.nft__container-title span {
  text-transform: uppercase;
  font-weight: 600;
  font-size: smaller;
}

.symbol,
.address {
  color: var(--color-heading);
  font-weight: 600;
  font-size: smaller;
}

.symbol {
  text-transform: uppercase;

}

.mt-2 {
  margin-top: 1rem;
}

.placeholder {
  background-color: var(--color-background-mute);
  border-radius: 12px;
  width: 120px;
  height: 120px;
  margin-right: 1rem;
  overflow: hidden;
}

.placeholder img {
  width: 100%;
  height: 100%;
}
</style>