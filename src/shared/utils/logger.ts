// =============================================================================
// logger.ts — Sistema de logging customizado
// =============================================================================
// [BP-04 FIX] Logger que evita console.log em produção, reduzindo poluição
// do console do usuário e evitando exposição de informações internas

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  /**
   * Se true, logs de nível 'info' e 'debug' são suprimidos em produção
   */
  suppressInProduction: boolean;
  
  /**
   * Prefixo adicionado a todas as mensagens de log
   */
  prefix: string;
}

const defaultConfig: LoggerConfig = {
  suppressInProduction: true,
  prefix: '[App]',
};

class Logger {
  private config: LoggerConfig;
  private isDev: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.isDev = import.meta.env.DEV;
  }

  /**
   * Log informativo (apenas em desenvolvimento)
   */
  info(...args: any[]): void {
    if (this.isDev || !this.config.suppressInProduction) {
      console.log(`${this.config.prefix} [INFO]`, ...args);
    }
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(...args: any[]): void {
    if (this.isDev || !this.config.suppressInProduction) {
      console.debug(`${this.config.prefix} [DEBUG]`, ...args);
    }
  }

  /**
   * Log de aviso (sempre exibido)
   */
  warn(...args: any[]): void {
    console.warn(`${this.config.prefix} [WARN]`, ...args);
  }

  /**
   * Log de erro (sempre exibido)
   */
  error(...args: any[]): void {
    console.error(`${this.config.prefix} [ERROR]`, ...args);
  }

  /**
   * Cria um logger com prefixo customizado
   * 
   * @example
   * const cartLogger = logger.withPrefix('[Cart]');
   * cartLogger.info('Item adicionado'); // [App] [Cart] [INFO] Item adicionado
   */
  withPrefix(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix} ${prefix}`,
    });
  }
}

/**
 * Instância padrão do logger
 * 
 * @example
 * import { logger } from '@/shared/utils/logger';
 * 
 * logger.info('Aplicação iniciada'); // Apenas em DEV
 * logger.error('Erro crítico'); // Sempre exibido
 * 
 * // Logger com prefixo customizado
 * const authLogger = logger.withPrefix('[Auth]');
 * authLogger.info('Usuário logado');
 */
export const logger = new Logger();

/**
 * Loggers especializados para diferentes módulos
 */
export const loggers = {
  auth: logger.withPrefix('[Auth]'),
  cart: logger.withPrefix('[Cart]'),
  checkout: logger.withPrefix('[Checkout]'),
  fcm: logger.withPrefix('[FCM]'),
  firebase: logger.withPrefix('[Firebase]'),
  admin: logger.withPrefix('[Admin]'),
};
