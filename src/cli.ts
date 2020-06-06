import yargs from 'yargs';

yargs
  .pkgConf('pepe')
  .command({
    command: 'deploy',
    describe: 'Deploy',
    handler: () =>
      console.log("Hello, you've just executed the command 'pepe deploy'."),
  })
  .help()
  .wrap(80);

export default yargs;
