/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { FrontMatterYAML } from 'src/kit/frontMatter';
import Synonym from '../main';
import { YAMLTest } from './yamlTest';

export async function startTest(plugin: Synonym) {
    console.log(plugin.settings.xunfeiAPI)
}  