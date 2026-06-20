import type { Chapter } from '@/types';
import { parseParagraphs } from '@/utils/textParser';
import { generateId } from '@/utils/storage';

const sampleTexts = [
  {
    title: '平凡的世界 第一章',
    content: `一九七五年二三月间，一个平平常常的日子，细濛濛的雨丝夹着一星半点的雪花，正纷纷淋淋地向大地飘洒着。时令已快到惊蛰，雪当然再不会存留，往往还没等落地，就已经消失得无踪无影了。

黄土高原严寒而漫长的冬天看来就要过去，但那真正温暖的春天还远远地没有到来。

在这样雨雪交加的日子里，如果没有什么紧要事，人们宁愿一整天足不出户。因此，县城的大街小巷倒也比平时少了许多嘈杂。街巷背阴的地方，冬天残留的积雪和冰溜子正在雨点的敲击下蚀化，石板街上到处都漫流着肮脏的污水。

只有那些半山腰的土窑洞，还像往常一样，温暖地亮着昏黄的灯光。窑洞里，人们盘腿坐在土炕上，一边纳鞋底、做针线，一边拉着闲话，任凭屋外的风雨吹打。

这就是我们的主人公孙少安和孙少平两兄弟生活的地方——黄土高原上一个名叫双水村的小村庄。`
  },
  {
    title: '射雕英雄传 节选',
    content: `钱塘江浩浩江水，日日夜夜无穷无休的从临安牛家村边绕过，东流入海。江畔一排数十株乌柏树，叶子似火烧般红，正是八月天时。村前村后的野草刚起始变黄，一抹斜阳映照之下，更增了几分萧索。

两株大松树下围着一堆村民，男男女女和十几个小孩，正自聚精会神的听着一个瘦削的老者说话。那说话人五十来岁年纪，一件青布长袍早洗得褪成了蓝灰色。只听他两片梨花木板碰了几下，左手中竹棒在一面小羯鼓上敲起得得连声。

只听那老者唱道：“小桃无主自开花，烟草茫茫带晚鸦。几处败垣围故井，向来一一是人家。”

唱罢，说道：“这诗是说的兵灾过后，百姓流离失所的惨状。各位看官，你道这诗是何人所作？原来是南宋一位爱国诗人，姓戴名复古。”

众人听得连连点头，脸上都露出愤慨之色。`
  },
  {
    title: '乡村爱情故事',
    content: `清晨的阳光洒在刘家村的田野上，金灿灿的麦浪随风起伏。刘老根扛着锄头，慢悠悠地走在田埂上，嘴里还哼着二人转的小调。

“老根哥，早啊！”隔壁的王大娘提着菜篮子从对面走来。

“早啊大妹子，这是去菜园子啊？”刘老根停下脚步，笑呵呵地打招呼。

“是啊，去摘点新鲜蔬菜。你家大宝最近咋样啊？听说跟村东头老李家的闺女走得挺近？”王大娘一脸八卦地问道。

刘老根摆摆手：“嗨，年轻人的事儿，咱管不了。让他们自己处去吧，咱当老人的，只要孩子们幸福就行。”

正说着，远处传来一阵自行车铃声，只见一个年轻小伙子骑着二八大杠，飞快地朝这边驶来。`
  }
];

export function getMockChapters(): Chapter[] {
  return sampleTexts.map((sample, index) => {
    const now = Date.now() - index * 86400000;
    return {
      id: generateId(),
      title: sample.title,
      content: sample.content,
      paragraphs: parseParagraphs(sample.content),
      createdAt: now,
      updatedAt: now,
      playProgress: index === 0 ? 30 : 0,
      isRead: index === 2
    };
  });
}

export const voiceOptions = [
  {
    id: 'slow' as const,
    name: '慢速旁白',
    description: '语速缓慢，咬字清晰，最适合老人收听',
    speed: 0.6,
    pitch: 1.0
  },
  {
    id: 'female' as const,
    name: '清亮女声',
    description: '声音温柔明亮，情感丰富',
    speed: 0.9,
    pitch: 1.4
  },
  {
    id: 'male' as const,
    name: '沉稳男声',
    description: '低沉浑厚，有磁性',
    speed: 0.8,
    pitch: 0.6
  },
  {
    id: 'dialect' as const,
    name: '方言韵味',
    description: '带点北方口音，亲切接地气',
    speed: 0.7,
    pitch: 1.2
  }
];
