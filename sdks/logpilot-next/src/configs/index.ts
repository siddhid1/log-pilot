export interface EnvConfig{
    baseUrl:string;
}

export const getEnvConfig = (): EnvConfig =>{
    return {
        baseUrl:"http://localhost:8080/api/v1"
    }
}