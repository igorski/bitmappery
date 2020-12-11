import LayerFactory from './layer-factory';

/**
 * Creates a new Document (project which contains
 * all layers and image content)
 */
export default {
    create( name = 'New document', width = 400, height = 300 ) {
        return {
            name,
            width,
            height,
            layers: [ LayerFactory.create() ],
        };
    },
};
