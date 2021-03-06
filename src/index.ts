import { addCommands, CommandIDs } from './git_mainmenu_command';

import { PathExt } from '@jupyterlab/coreutils';

import { GitWidget } from './components/GitWidget';

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import '../style/variables.css';

/**
 * The default running sessions extension.
 */
const plugin: JupyterLabPlugin<IGitExtension> = {
  id: 'jupyter.extensions.running-sessions-git',
  requires: [IMainMenu, ILayoutRestorer],
  activate,
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

export const EXTENSION_ID = 'jupyter.extensions.git_plugin';

export const IGitExtension = new Token<IGitExtension>(EXTENSION_ID);

/** Interface for extension class */
export interface IGitExtension {
  register_diff_provider(filetypes: string[], callback: IDiffCallback): void;
}

/** Function type for diffing a file's revisions */
export type IDiffCallback = (
  filename: string,
  revisionA: string,
  revisionB: string
) => void;

/** Main extension class */
export class GitExtension implements IGitExtension {
  git_plugin: GitWidget;
  constructor(app: JupyterLab, restorer: ILayoutRestorer) {
    this.git_plugin = new GitWidget(
      app,
      { manager: app.serviceManager },
      this.performDiff.bind(this)
    );
    this.git_plugin.id = 'jp-git-sessions';
    this.git_plugin.title.label = 'Git';

    // Let the application restorer track the running panel for restoration of
    // application state (e.g. setting the running panel as the current side bar
    // widget).

    restorer.add(this.git_plugin, 'git-sessions');
    app.shell.addToLeftArea(this.git_plugin, { rank: 200 });
  }

  register_diff_provider(filetypes: string[], callback: IDiffCallback): void {
    filetypes.forEach(fileType => {
      this.diffProviders[fileType] = callback;
    });
  }

  performDiff(
    app: JupyterLab,
    filename: string,
    revisionA: string,
    revisionB: string
  ) {
    let extension = PathExt.extname(filename).toLocaleLowerCase();
    if (this.diffProviders[extension] !== undefined) {
      this.diffProviders[extension](filename, revisionA, revisionB);
    } else {
      app.commands.execute('git:terminal-cmd', {
        cmd: 'git diff ' + revisionA + ' ' + revisionB
      });
    }
  }

  private diffProviders: { [key: string]: IDiffCallback } = {};
}
/**
 * Activate the running plugin.
 */
function activate(
  app: JupyterLab,
  mainMenu: IMainMenu,
  restorer: ILayoutRestorer
): IGitExtension {
  const { commands } = app;
  let git_extension = new GitExtension(app, restorer);
  const category = 'Git';

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  addCommands(app, app.serviceManager);
  let menu = new Menu({ commands });
  let tutorial = new Menu({ commands });
  tutorial.title.label = ' Tutorial ';
  menu.title.label = category;
  [
    CommandIDs.gitUI,
    CommandIDs.gitTerminal,
    CommandIDs.gitInit
  ].forEach(command => {
    menu.addItem({ command });
  });

  [CommandIDs.setupRemotes, CommandIDs.googleLink].forEach(command => {
    tutorial.addItem({ command });
  });
  menu.addItem({ type: 'submenu', submenu: tutorial });
  mainMenu.addMenu(menu, { rank: 60 });
  return git_extension;
}
