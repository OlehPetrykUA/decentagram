import Web3 from 'web3';
import {Observable, ReplaySubject} from 'rxjs';

import {isMetaMaskInstalled} from '../helpers/meta-mask.helper';
import {Constructor} from '../models/helper-types/constructor.type';
import {NetworkType} from '../enums/network-type.enum';

export class EthereumService {
    public static instance: EthereumService;

    private readonly ETHEREUM: any;
    private readonly WEB3: Web3;
    private _account: ReplaySubject<string> = new ReplaySubject();
    private _chain: ReplaySubject<string> = new ReplaySubject();

    private _isReady: ReplaySubject<boolean> = new ReplaySubject();

    public get account(): Observable<string> {
        return this._account.asObservable();
    }

    public get isReady(): Observable<boolean> {
        return this._isReady.asObservable();
    }

    public get chain(): Observable<string> {
        return this._chain.asObservable();
    }

    public get isTestNetwork(): boolean {
        return this.ETHEREUM.chainId === NetworkType.Ropsten;
    }

    constructor(ethereum: any) {
        if (isMetaMaskInstalled()) {
            this.ETHEREUM = ethereum;
            this.WEB3 = new Web3(this.ETHEREUM);
            this.ETHEREUM.request({method: 'eth_chainId'})
                .then((chain: string) => {
                    this._chain.next(chain);
                    return this.ETHEREUM.request({method: 'eth_requestAccounts'});
                })
                .then(([account]: Array<string>) => {
                    this._account.next(account);
                    this._isReady.next(true);
                    this.ETHEREUM.on('accountsChanged', ([account]: [string]) => this._onAccountChange(account));
                    this.ETHEREUM.on('chainChanged', (chain: string) => this._onChainChange(chain));
                });
        }
    }

    public static getInstance(): EthereumService {
        if (isMetaMaskInstalled()) {
            if (!EthereumService.instance) {
                EthereumService.instance = new EthereumService(window['ethereum']);
            }
            return EthereumService.instance;
        } else {
            throw new Error('Meta Mask is not installed');
        }
    }

    public contractFactory<T>(contractConstructor: Constructor<T>): T {
        return new contractConstructor(this.WEB3);
    }

    private _onAccountChange(account: string): void {
        this._isReady.next(false);
        this.ETHEREUM.enable()
            .then(() => this._account.next(account))
            .then(() => this._isReady.next(true));
    }

    private _onChainChange(chain: string): void {
        this._isReady.next(false);
        this.ETHEREUM.enable()
            .then(() => this._chain.next(chain))
            .then(() => this.WEB3.eth.getAccounts())
            .then(([account]: Array<string>) => this._account.next(account))
            .then(() => this._isReady.next(true));
    }
}