import { Dialog, Transition } from '@headlessui/react';
import React, { FC, Fragment, useEffect, useRef, useState } from 'react';
import { AUTH_HEADER, CLIENT_ID, GRAPHQL_URL } from '../constants';

function App() {
    const amountRef = useRef<HTMLInputElement>(null);
    const [ loading, setLoading ] = useState(false);
    const [ isOpen, setIsOpen ] = useState(false);
    const [ paymentUrl, setPaymentUrl ] = useState<string | undefined>();

    const closeModal = () => {
        setIsOpen(false);
    };

    const handleCollectPayment = async () => {
        const amount = amountRef.current?.value;

        if (!amount) {
            return;
        }

        setLoading(true);
        const amountInCents = parseFloat(amount) * 100;
        const url = await createPaymentLink(amountInCents);
        setLoading(false);
        setPaymentUrl(url);
        setIsOpen(true);
    };

    return (
        <div className="container mx-auto">
            <div className="max-w-sm mt-12">
                <div className="mt-4">
                    <label
                        htmlFor="price"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Amount
                    </label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="text"
                            name="price"
                            id="price"
                            ref={amountRef}
                            className="block w-full pr-12 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pl-7 sm:text-sm"
                            placeholder="0.00"
                            aria-describedby="price-currency"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span
                                className="text-gray-500 sm:text-sm"
                                id="price-currency"
                            >
                                USD
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 mt-4 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={handleCollectPayment}
                >
                    { loading ? 'Loading...' : 'Collect Payment' }
                </button>
            </div>

            <CollectPaymentModal
                isOpen={isOpen}
                closeModal={closeModal}
                url={paymentUrl}
            />
        </div>
    );
}

export interface CollectPaymentModalProps {
    closeModal: () => void;
    isOpen: boolean;
    url: string | undefined;
}

const CollectPaymentModal: FC<CollectPaymentModalProps> = ({
    closeModal,
    isOpen,
    url,
}) => {
    const { iframeRef, height } = useIframeHeight();

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (iframeRef.current?.contentWindow === e.source) {
                const { data } = e;
                if (data.type === 'pd:page_success') {
                    setTimeout(() => {
                        closeModal();
                    }, 2000);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-10 overflow-y-auto"
                onClose={closeModal}
            >
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-50" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span
                        className="inline-block h-screen align-middle"
                        aria-hidden="true"
                    >
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div
                            className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                            style={{ height: height ? `${height + 48}px` : '90vh' }}
                        >
                            <iframe
                                ref={iframeRef}
                                className="w-full h-full"
                                src={url}
                            />
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

const createPaymentLink = async (amount: number): Promise<string> => {
    const res = await fetch(
        GRAPHQL_URL,
        {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': AUTH_HEADER,
            },
            body: JSON.stringify({
                query: `
                    mutation addPaymentLink($input: AddPaymentLinkInput!){
                        addPaymentLink(input: $input){
                            url
                        }
                    }
                `,
                variables: {
                    input: {
                        clientId: CLIENT_ID,
                        operating: amount,
                    }
                }
            })
        }
    );

    const body = await res.json();

    if (body.errors) {
        throw new Error(`Error creating payment link: ${body.errors[0].message}`);
    }

    return body.data.addPaymentLink.url;
}

const useIframeHeight = () => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [ height, setHeight ] = useState<number | null>(null);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (iframeRef.current?.contentWindow === e.source) {
                const { data } = e;
                if (data.type === 'pd:height_change' && data.height > 0) {
                    setHeight(data.height);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [iframeRef.current]);

    return {
        iframeRef,
        height,
    }
}

export default App;
