/*
 * Copyright 2019 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Observable } from 'rxjs';
import { BlockInfoDTO, BlockRoutesApi } from 'symbol-openapi-typescript-node-client';
import { PublicAccount } from '../model/account/PublicAccount';
import { BlockInfo } from '../model/blockchain/BlockInfo';
import { MerklePathItem } from '../model/blockchain/MerklePathItem';
import { MerkleProofInfo } from '../model/blockchain/MerkleProofInfo';
import { Transaction } from '../model/transaction/Transaction';
import { UInt64 } from '../model/UInt64';
import { BlockRepository } from './BlockRepository';
import { Http } from './Http';
import { QueryParams } from './QueryParams';
import { CreateTransactionFromDTO } from './transaction/CreateTransactionFromDTO';

/**
 * Blockchain http repository.
 *
 * @since 1.0
 */
export class BlockHttp extends Http implements BlockRepository {
    /**
     * @internal
     * Symbol openapi typescript-node client block routes api
     */
    private readonly blockRoutesApi: BlockRoutesApi;

    /**
     * Constructor
     * @param url
     */
    constructor(url: string) {
        super(url);
        this.blockRoutesApi = new BlockRoutesApi(url);
        this.blockRoutesApi.useQuerystring = true;
    }

    /**
     * Gets a BlockInfo for a given block height
     * @param height - Block height
     * @returns Observable<BlockInfo>
     */
    public getBlockByHeight(height: UInt64): Observable<BlockInfo> {
        return this.call(this.blockRoutesApi.getBlockByHeight(height.toString()), (body) => this.toBlockInfo(body));
    }

    /**
     * Gets array of transactions included in a block for a block height
     * @param height - Block height
     * @param queryParams - (Optional) Query params
     * @returns Observable<Transaction[]>
     */
    public getBlockTransactions(height: UInt64, queryParams?: QueryParams): Observable<Transaction[]> {
        return this.call(
            this.blockRoutesApi.getBlockTransactions(
                height.toString(),
                this.queryParams(queryParams).pageSize,
                this.queryParams(queryParams).id,
                this.queryParams(queryParams).ordering,
            ),
            (body) =>
                body.map((transactionDTO) => {
                    return CreateTransactionFromDTO(transactionDTO);
                }),
        );
    }

    /**
     * Gets array of BlockInfo for a block height with limit
     * @param height - Block height from which will be the first block in the array
     * @param limit - Number of blocks returned.
     * @returns Observable<BlockInfo[]>
     */
    public getBlocksByHeightWithLimit(height: UInt64, limit: number): Observable<BlockInfo[]> {
        return this.call(this.blockRoutesApi.getBlocksByHeightWithLimit(height.toString(), limit), (body) =>
            body.map((blockDTO) => this.toBlockInfo(blockDTO)),
        );
    }

    /**
     * This method maps a BlockInfoDTO from rest to the SDK's BlockInfo model object.
     *
     * @internal
     * @param {BlockInfoDTO} dto the dto object from rest.
     * @returns {BlockInfo} a BlockInfo model
     */
    private toBlockInfo(dto: BlockInfoDTO): BlockInfo {
        const networkType = dto.block.network.valueOf();
        return new BlockInfo(
            dto.meta.hash,
            dto.meta.generationHash,
            UInt64.fromNumericString(dto.meta.totalFee),
            dto.meta.stateHashSubCacheMerkleRoots,
            dto.meta.numTransactions,
            dto.block.signature,
            PublicAccount.createFromPublicKey(dto.block.signerPublicKey, networkType),
            networkType,
            dto.block.version,
            dto.block.type,
            UInt64.fromNumericString(dto.block.height),
            UInt64.fromNumericString(dto.block.timestamp),
            UInt64.fromNumericString(dto.block.difficulty),
            dto.block.feeMultiplier,
            dto.block.previousBlockHash,
            dto.block.transactionsHash,
            dto.block.receiptsHash,
            dto.block.stateHash,
            dto.block.proofGamma,
            dto.block.proofScalar,
            dto.block.proofVerificationHash,
            dto.block.beneficiaryPublicKey ? PublicAccount.createFromPublicKey(dto.block.beneficiaryPublicKey, networkType) : undefined,
            dto.meta.numStatements,
        );
    }

    /**
     * Get the merkle path for a given a transaction and block
     * Returns the merkle path for a [transaction](https://nemtech.github.io/concepts/transaction.html)
     * included in a block. The path is the complementary data needed to calculate the merkle root.
     * A client can compare if the calculated root equals the one recorded in the block header,
     * verifying that the transaction was included in the block.
     * @param height The height of the block.
     * @param hash The hash of the transaction.
     * @return Observable<MerkleProofInfo>
     */
    public getMerkleTransaction(height: UInt64, hash: string): Observable<MerkleProofInfo> {
        return this.call(
            this.blockRoutesApi.getMerkleTransaction(height.toString(), hash),
            (body) => new MerkleProofInfo(body.merklePath!.map((payload) => new MerklePathItem(payload.position, payload.hash))),
        );
    }
}
