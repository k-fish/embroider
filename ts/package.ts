import { Memoize } from 'typescript-memoize';
import { join, dirname } from 'path';
import { Tree } from 'broccoli-plugin';
import mergeTrees from 'broccoli-merge-trees';
import V1InstanceCache from './v1-instance-cache';
import resolve from 'resolve';
import PackageCache from './package-cache';
import { todo } from './messages';
import flatMap from 'lodash/flatMap';
import V1Package from './v1-package';

export default class Package {
  protected oldPackage: V1Package;

  constructor(public root: string, private packageCache: PackageCache, private v1Cache: V1InstanceCache) {}

  get name(): string {
    return this.oldPackage.name;
  }

  addParent(pkg: Package){
    let v1Addon = this.v1Cache.getAddon(this.root, pkg.root);
    if (v1Addon) {
      if (!this.oldPackage) {
        this.oldPackage = v1Addon;
      } else if (v1Addon.hasAnyTrees()){
        todo(`duplicate build of ${v1Addon.name}`);
      }
    }
  }

  get tree(): Tree {
    let trees = this.oldPackage.v2Trees;
    return mergeTrees(trees);
  }

  @Memoize()
  private get packageJSON() {
    return require(join(this.root, 'package.json'));
  }

  get isEmberPackage() : boolean {
    let keywords = this.packageJSON.keywords;
    return keywords && keywords.indexOf('ember-addon') !== -1;
  }

  protected dependencyKeys() {
    return ['dependencies'];
  }

  get dependencies(): Package[] {
    let names = flatMap(this.dependencyKeys(), key => Object.keys(this.packageJSON[key] || {}));
    return names.map(name => {
      let addonRoot = dirname(resolve.sync(join(name, 'package.json'), { basedir: this.root }));
      return this.packageCache.getPackage(addonRoot, this);
    }).filter(Boolean);
  }
}