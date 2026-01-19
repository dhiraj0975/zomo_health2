import { Injectable } from '@nestjs/common';
import * as parse5 from 'parse5';
// import { parse, serialize } from 'parse5';
@Injectable()
export class HtmlTagService {
    /* Class Based On remove content */
        removeElementsByClassName(htmlContent: string, className: string): string {
            try{
                const document = parse5.parse(htmlContent);
                this.removeElementsWithClass(document, className);
                return parse5.serialize(document);
            }catch(err){
                throw new Error(err.message);
            }
        }
        private removeElementsWithClass(node: any, className: string) {
            try{
                if (node.childNodes) {
                    node.childNodes = node.childNodes.filter((child: any) => {
                        if (this.isElementNode(child)) {
                            const classAttr = child.attrs.find((attr: any) => attr.name === 'class');
                            if (classAttr && classAttr.value.split(' ').includes(className)) {
                                return false; // Remove this element
                            }
                            this.removeElementsWithClass(child, className); // Recurse into child nodes
                        }
                        return true;
                    });
                }
            }catch(err){
                throw new Error(err.message);
            }
        }
        private isElementNode(node: any): boolean {
            try{
                return node.nodeName !== '#text' && node.nodeName !== '#comment' && node.nodeName !== undefined;
            }catch(err){
                throw new Error(err.message);
            }
        }
    /* Class On remove content */
    /* Image Html append on class */
        appendImageToLogoDivs(htmlContent: string, imageUrl: string): string {
            try{
                const document = parse5.parse(htmlContent);
                const logoDivs = this.findAllLogoDivs(document);
                logoDivs.forEach((logoDiv: any) => {
                    this.appendImageToLogoDiv(document, logoDiv, imageUrl);
                });
                return parse5.serialize(document);
            }catch(err){
                throw new Error(err.message);
            }
        }
        private findAllLogoDivs(document: any): any[] {
            try{
                const logoDivs: any[] = [];
                const traverse = (node: any) => {
                    if (node.tagName === 'div' && this.hasClass(node, 'logoDiv')) {
                        logoDivs.push(node);
                    }
                    if (node.childNodes) {
                        node.childNodes.forEach((childNode: any) => {
                            traverse(childNode);
                        });
                    }
                };
                traverse(document);
                return logoDivs;
            }catch(err){
                throw new Error(err.message);
            }
        }
        private appendImageToLogoDiv(document: any, logoDiv: any, imageUrl: string) {
            try{
                const ElementOfImag = logoDiv['attrs'];
                const ImageWidthOriginalSet = ElementOfImag.find(attr => attr.name === 'data-zh-i-wh')?.value;
                const imgElement = this.createImageElement(document, imageUrl, ImageWidthOriginalSet);
                logoDiv.childNodes.push(imgElement);
            }catch(err){
                throw new Error(err.message);
            }
        }
        private createImageElement(document: any, imageUrl: string, ImageWidthOriginalSet: string): any {
            try{
                return {
                    nodeName: 'img',
                    tagName: 'img',
                    attrs: [
                        { name: 'class', value: 'onluShowImage zh-wh-s' },
                        { name: 'align', value: 'one_image' },
                        { name: 'src', value: imageUrl },
                        { name: 'alt', value: 'Image' },
                        { name: 'width', value: ImageWidthOriginalSet } // Adjust width as needed
                    ],
                    namespaceURI: 'http://www.w3.org/1999/xhtml'
                };
            }catch(err){
                throw new Error(err.message);
            }
        }
        private hasClass(node: any, className: string): boolean {
            try{
                return node.attrs && node.attrs.some((attr: any) => attr.name === 'class' && attr.value.split(' ').includes(className));
            }catch(err){
                throw new Error(err.message);
            }
        }
    /* Image Html append on class */
    /* Class on Div Content Remove */
        clearDivContentByClass(html: string, className: string): string {
            try{
                const document = parse5.parse(html);
                this.traverseAndClear(document, className);
                return parse5.serialize(document);
            }catch(err){
                throw new Error(err.message);
            }
        }
        private traverseAndClear(node: any, className: string) {
            try{
                if (this.isElementNode(node)) {
                    if (node.tagName === 'div' && this.hasClassClear(node, className)) {
                        node.childNodes = [];
                    } else {
                        if (node.childNodes) {
                            for (const childNode of node.childNodes) {
                                this.traverseAndClear(childNode, className);
                            }
                        }
                    }
                }
            }catch(err){
                throw new Error(err.message);
            }
        }
        private hasClassClear(element: any, className: string): boolean {
            try{
                const classAttr = element.attrs.find((attr: any) => attr.name === 'class');
                if (classAttr) {
                    const classes = classAttr.value.split(/\s+/);
                    return classes.includes(className);
                }
                return false;
            }catch(err){
                throw new Error(err.message);
            }
        }
    /* Class on Div Content Remove */
}