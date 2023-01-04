interface MyReactElement {
    type: string,
    key: string,
    props: {
        [key: string]: any,
        children: MyReactElement[],
    },
};

function createElement(type: string, props: any, ...children: MyReactElement[]): MyReactElement {
    console.log({type, props});
    return {
        type,
        key: 'a',
        props: {
            ...props,
            children: children.map(child => {
                return typeof child === 'object' ? child : createTextElement(child);
            }),
        },
    }
}

function createTextElement(text: string): MyReactElement {
    console.log({type: 'TEXT', props: {nodeValue: text}});
    return {
        type: "TEXT_ELEMENT",
        key: 'a',
        props: {
            nodeValue: text,
            children: [],
        },
    }
}

export type { MyReactElement };
export default { createElement };