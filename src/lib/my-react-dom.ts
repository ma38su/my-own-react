import { MyReactElement } from "./my-react.js";

function render(element: MyReactElement, container: HTMLElement) {
    const { type } = element;

    if (type === "TEXT_ELEMENT") {
        const dom = document.createTextNode("");
        const isProperty = (key: string) => key !== 'children';
        Object.keys(element.props).filter(isProperty).forEach(name => {
            (dom as any)[name] = element.props[name];
        })
        container.appendChild(dom);
    } else {

        const dom = document.createElement(type);
        element.props.children.forEach((child) => {
            render(child, dom);
        });

        const isProperty = (key: string) => key !== 'children';
        Object.keys(element.props).filter(isProperty).forEach(name => {
            (dom as any)[name] = element.props[name];
        })

        container.appendChild(dom);
    }
}

export { render };
