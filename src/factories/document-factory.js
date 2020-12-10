import LayerFactory from './layer-factory';

/**
 * Creates a new Document (project which contains
 * all layers and image content)
 */
export default {
    create() {
        return {
            layers: [ LayerFactory.create() ],
        };
    },
};
