export type DetailItem = { label: string; value: string };
export type FirmDetailsData = { introduction: string; history: string; tradingRules: string; payoutRules: string; pros: string[]; cons: string[]; facts: DetailItem[]; plans: {name:string;size:string;price:string;target:string;dailyLoss:string;maxLoss:string}[]; faqs: {question:string;answer:string}[]; discounts:{code:string;amount:string;note:string}[]; updatedAt?:string };
export const emptyDetails: FirmDetailsData = {introduction:"",history:"",tradingRules:"",payoutRules:"",pros:[],cons:[],facts:[],plans:[],faqs:[],discounts:[]};
