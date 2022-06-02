const path = require('path');

module.exports = {
  title: 'carlin',
  tagline: 'A Cloud Deployment Framework',
  url: 'https://carlin.ttoss.dev',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'ttoss',
  projectName: 'carlin',

  plugins: [path.resolve(__dirname, 'carlin')],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/ttoss/carlin/edit/main/packages/website',
        },
        // blog: {
        //   showReadingTime: true,
        //   // Please change this to your repo.
        //   editUrl:
        //     'https://github.com/facebook/docusaurus/edit/master/website/blog/',
        // },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'carlin',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          position: 'left',
          docId: 'docs/overview',
          label: 'Docs',
        },
        // {
        //   type: 'doc',
        //   position: 'left',
        //   docId: 'api/api',
        //   label: 'API',
        // },
        {
          href: 'https://github.com/ttoss/carlin',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            // {
            //   label: 'Deploy',
            //   to: 'docs/Commands/deploy',
            // },
            // {
            //   label: 'API',
            //   to: 'api/api',
            // },
          ],
        },
        // {
        //   title: 'Community',
        //   items: [
        //     {
        //       label: 'Stack Overflow',
        //       href: 'https://stackoverflow.com/questions/tagged/carlin',
        //     },
        //     {
        //       label: 'Discord',
        //       href: 'https://discordapp.com/invite/docusaurus',
        //     },
        //     {
        //       label: 'Twitter',
        //       href: 'https://twitter.com/docusaurus',
        //     },
        //   ],
        // },
        // {
        //   title: 'More',
        //   items: [
        //     {
        //       label: 'Blog',
        //       to: 'blog',
        //     },
        //     {
        //       label: 'GitHub',
        //       href: 'https://github.com/ttoss/carlin',
        //     },
        //   ],
        // },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
    // sidebarCollapsible: false,
  },
};
