import chalk from 'chalk';
import figlet from 'figlet';

export const getIntroText = (version: string): string => {
  return (
    chalk.green(figlet.textSync('C4-DSL-Builder')) +
    '\n' +
    chalk.grey(`Version ${version}`) +
    '\n' +
    chalk.blue('\nEnhance your C4 Modelling\n')
  );
};
