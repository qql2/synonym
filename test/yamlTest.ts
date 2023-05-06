/* eslint-disable prefer-const */

import { YAML } from "src/kit/YAML"

/* eslint-disable @typescript-eslint/no-unused-vars */
export class YAMLTest {
    yaml: YAML
    constructor() {
    }
    startALLTest() {
        this.test1()
        this.test2()
        this.test3()
        this.test4()
        this.test5()
        this.test6()
    }
    test1() {
        let text = `keys: ['key1', 'key2']
tags:
- 1 666 233
- 2
- 'sex'`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(text, tags, 'yes')
        console.assert(rst == `keys: [ 'key1', 'key2' ]
tags:
  - 1 666 233
  - 2
  - 'sex'
  - woc nb #yes
`, `test1:\n${rst}`)
    }

    test2() {
        let yaml = `keys: ['key1','key2']`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(yaml, tags, 'yes')
        console.assert(rst === `keys: [ 'key1', 'key2' ]
tags:
  - woc nb #yes
`, `test2:\n${rst}`)
    }

    test3() {
        let yaml = `tags: ['2','y']`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(yaml, tags, 'yes')
        console.assert(rst === `tags:
  - '2'
  - 'y'
  - woc nb #yes
`, `test3:\n${rst}`)
    }
    test4() {
        let yaml = `tags:
- 666 #yes`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(yaml, tags, 'yes')
        console.assert(rst === `tags:
  - woc nb #yes
`, `test4:\n${rst}`)
    }
    test5() {
        let yaml = `tags:
#yes
- 666
- 233
- 555`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(yaml, tags, 'yes')
        console.assert(rst === `tags:
  - 233
  - 555
  - woc nb #yes
`, `test5:\n${rst}`)
    }
    test6() {
        let yaml = `tags:
- 555
#yes
- 666
`
        let tags = ['woc', 'nb']
        let rst = YAML.setTagsInYAML(yaml, tags, 'yes')
        console.assert(rst === `tags:
  - 555
  - woc nb #yes
`, `test6:\n${rst}`)
    }
}