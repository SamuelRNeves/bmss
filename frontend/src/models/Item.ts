import { User } from "./User";

export interface Item{
    id:number;
    tipo:string;
    descricao:string;
    dataCadastro:string;
    user:User;
}