import dotenv from 'dotenv';

dotenv.config();

interface Config{
    serverPort: number;
    nodeEnv: string;
    pgHost: string;
    pgPort: number;
    pgDatabase: string;
    pgUser: string;
    pgPassword: string;
}

const config : Config = {
    serverPort : Number(process.env.PORT) || 8080,
    nodeEnv: process.env.nodeEnv || 'development',
    pgHost: process.env.pgHost || 'localhost',
    pgPort: Number(process.env.pgPort) || 5432,
    pgDatabase: process.env.pgDatabase || 'speedy_poker',
    pgUser: process.env.pgUserName || '',
    pgPassword: process.env.pgPassword || '',
}

export default config;