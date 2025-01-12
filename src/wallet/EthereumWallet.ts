import { ethers } from 'ethers';
import { ReplicantConfig, WalletProvider, Plugin } from '../core/interfaces';

export interface EthereumConfig extends ReplicantConfig {
    ethereumPrivateKey: string;
    ethereumRpcUrl: string;
}

export class EthereumWallet implements WalletProvider, Plugin {
    private wallet: ethers.Wallet;
    private provider: ethers.JsonRpcProvider;
    public readonly name: string = 'ethereum';
    public readonly version: string = '1.0.0';
    public readonly type: 'wallet' = 'wallet';

    constructor(config: EthereumConfig) {
        if (!config.ethereumPrivateKey || !config.ethereumRpcUrl) {
            throw new Error('Ethereum private key and RPC URL are required for EthereumWallet');
        }

        this.provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
        this.wallet = new ethers.Wallet(config.ethereumPrivateKey, this.provider);
    }

    async initialize(): Promise<void> {
        // Verify connection and wallet
        await this.provider.getNetwork();
        const balance = await this.provider.getBalance(this.wallet.address);
        if (balance === null) {
            throw new Error('Failed to connect to Ethereum network');
        }
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up
    }

    async getBalance(): Promise<string> {
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }

    async sendTransaction(to: string, amount: string): Promise<string> {
        const tx = await this.wallet.sendTransaction({
            to,
            value: ethers.parseEther(amount)
        });
        await tx.wait();
        return tx.hash;
    }

    async sendToken(
        tokenAddress: string,
        to: string,
        amount: string
    ): Promise<string> {
        const erc20Abi = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)',
        ];

        const contract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);
        const decimals = await contract.decimals();
        const value = ethers.parseUnits(amount, decimals);

        const tx = await contract.transfer(to, value);
        await tx.wait();
        return tx.hash;
    }

    getAddress(): string {
        return this.wallet.address;
    }

    async signMessage(message: string): Promise<string> {
        return await this.wallet.signMessage(message);
    }
} 